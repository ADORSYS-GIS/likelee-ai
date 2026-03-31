import React, { useRef, useState, useEffect } from "react";

// -----------------------------------------------------------------------
// DobInput – segmented MM / DD / YYYY input with scroll-wheel year picker
// -----------------------------------------------------------------------
// Props:
//   value      – ISO date string "YYYY-MM-DD" or "" when empty
//   onChange   – called with a valid ISO date string or "" on every change
//   minAge     – minimum age in years for inline validation (default 18)
//   variant    – "sharp" uses border-2 / rounded-none (AddTalent style)
//                "rounded" uses standard rounded border (CreatorDashboard style)
//   className  – extra classes applied to the outer wrapper
// -----------------------------------------------------------------------

interface DobInputProps {
  value: string;
  onChange: (iso: string) => void;
  minAge?: number;
  variant?: "sharp" | "rounded";
  className?: string;
}

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = CURRENT_YEAR - 120; // oldest selectable year

function padTwo(n: string | number) {
  return String(n).padStart(2, "0");
}

/** Parse an ISO string "YYYY-MM-DD" → { mm, dd, yyyy } parts (strings) */
function parseIso(iso: string): { mm: string; dd: string; yyyy: string } {
  if (!iso) return { mm: "", dd: "", yyyy: "" };
  const parts = iso.split("-");
  if (parts.length === 3) {
    return { mm: parts[1] || "", dd: parts[2] || "", yyyy: parts[0] || "" };
  }
  return { mm: "", dd: "", yyyy: "" };
}

/** Build ISO string from parts. Returns "" if parts are incomplete/invalid. */
function buildIso(mm: string, dd: string, yyyy: string): string {
  if (mm.length < 1 || dd.length < 1 || yyyy.length < 4) return "";
  const m = parseInt(mm, 10);
  const d = parseInt(dd, 10);
  const y = parseInt(yyyy, 10);
  if (
    isNaN(m) ||
    m < 1 ||
    m > 12 ||
    isNaN(d) ||
    d < 1 ||
    d > 31 ||
    isNaN(y) ||
    y < MIN_YEAR ||
    y > CURRENT_YEAR
  )
    return "";
  return `${y}-${padTwo(m)}-${padTwo(d)}`;
}

/** Return age in whole years from ISO string, or null if invalid */
function ageFromIso(iso: string): number | null {
  if (!iso) return null;
  const birth = new Date(iso);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function DobInput({
  value,
  onChange,
  minAge = 18,
  variant = "rounded",
  className = "",
}: DobInputProps) {
  const { mm: initMm, dd: initDd, yyyy: initYyyy } = parseIso(value);
  const [mm, setMm] = useState(initMm);
  const [dd, setDd] = useState(initDd);
  const [yyyy, setYyyy] = useState(initYyyy);
  const [yearWheelOpen, setYearWheelOpen] = useState(false);
  const [touched, setTouched] = useState(false);

  const mmRef = useRef<HTMLInputElement>(null);
  const ddRef = useRef<HTMLInputElement>(null);
  const yyyyRef = useRef<HTMLInputElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync with external value changes
  useEffect(() => {
    const { mm: eMm, dd: eDd, yyyy: eYyyy } = parseIso(value);
    if (eMm !== mm) setMm(eMm);
    if (eDd !== dd) setDd(eDd);
    if (eYyyy !== yyyy) setYyyy(eYyyy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Fire onChange whenever parts change
  useEffect(() => {
    const iso = buildIso(mm, dd, yyyy);
    // Only propagate if iso changed vs current value
    if (iso !== value) {
      onChange(iso);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mm, dd, yyyy]);

  // Close the wheel when clicking outside
  useEffect(() => {
    if (!yearWheelOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (
        wheelRef.current &&
        !wheelRef.current.contains(e.target as Node) &&
        yyyyRef.current &&
        !yyyyRef.current.contains(e.target as Node)
      ) {
        setYearWheelOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [yearWheelOpen]);

  // Scroll the active year into view inside the wheel
  useEffect(() => {
    if (!yearWheelOpen || !wheelRef.current) return;
    const activeEl = wheelRef.current.querySelector("[data-active='true']");
    if (activeEl) {
      (activeEl as HTMLElement).scrollIntoView({ block: "center" });
    }
  }, [yearWheelOpen]);

  const handleMmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, "").slice(0, 2);
    setMm(v);
    setTouched(true);
    // Auto-advance to DD when 2 digits entered
    if (v.length === 2) {
      const num = parseInt(v, 10);
      if (num >= 1 && num <= 12) {
        setTimeout(() => ddRef.current?.focus(), 0);
      }
    }
  };

  const handleDdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, "").slice(0, 2);
    setDd(v);
    setTouched(true);
    if (v.length === 2) {
      const num = parseInt(v, 10);
      if (num >= 1 && num <= 31) {
        setTimeout(() => yyyyRef.current?.focus(), 0);
      }
    }
  };

  const handleYyyyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, "").slice(0, 4);
    setYyyy(v);
    setTouched(true);
  };

  const handleMmBlur = () => {
    if (mm.length === 1) setMm(padTwo(mm));
    setTouched(true);
  };

  const handleDdBlur = () => {
    if (dd.length === 1) setDd(padTwo(dd));
    setTouched(true);
  };

  const handleYyyyBlur = () => setTouched(true);

  const handleYearSelect = (year: number) => {
    setYyyy(String(year));
    setTouched(true);
    setYearWheelOpen(false);
    yyyyRef.current?.blur();
  };

  // Available years in the scroll wheel: youngest (current) → oldest
  const years: number[] = [];
  for (let y = CURRENT_YEAR; y >= MIN_YEAR; y--) {
    years.push(y);
  }

  const iso = buildIso(mm, dd, yyyy);
  const age = ageFromIso(iso);
  const underAge = touched && iso !== "" && age !== null && age < minAge;
  const incompleteDate =
    touched && iso === "" && (mm !== "" || dd !== "" || yyyy.length === 4);

  // Variant styles
  const fieldBorder =
    variant === "sharp"
      ? "border-2 border-gray-300 rounded-none"
      : "border border-gray-300 rounded-md";
  const fieldFocus =
    "focus:outline-none focus:ring-2 focus:ring-[#32C8D1] focus:border-[#32C8D1]";
  const fieldError =
    underAge || incompleteDate
      ? "border-red-400 focus:ring-red-300 focus:border-red-400"
      : "";

  const inputCls = `h-10 bg-white text-gray-900 text-sm text-center px-1 transition-colors ${fieldBorder} ${fieldFocus} ${fieldError}`;

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      {/* Segment row */}
      <div className="flex items-center gap-1">
        {/* MM */}
        <input
          ref={mmRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          placeholder="MM"
          value={mm}
          onChange={handleMmChange}
          onBlur={handleMmBlur}
          aria-label="Month"
          className={`${inputCls} w-14`}
        />
        <span className="text-gray-400 font-semibold select-none">/</span>

        {/* DD */}
        <input
          ref={ddRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          placeholder="DD"
          value={dd}
          onChange={handleDdChange}
          onBlur={handleDdBlur}
          aria-label="Day"
          className={`${inputCls} w-14`}
        />
        <span className="text-gray-400 font-semibold select-none">/</span>

        {/* YYYY – click to open wheel */}
        <div className="relative">
          <input
            ref={yyyyRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            placeholder="YYYY"
            value={yyyy}
            onChange={handleYyyyChange}
            onBlur={handleYyyyBlur}
            onFocus={() => setYearWheelOpen(true)}
            onClick={() => setYearWheelOpen(true)}
            aria-label="Year"
            className={`${inputCls} w-20`}
          />

          {/* Scroll-wheel year picker */}
          {yearWheelOpen && (
            <div
              ref={wheelRef}
              className="absolute left-0 top-full mt-1 w-28 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-y-auto"
              style={{ maxHeight: "200px" }}
            >
              {years.map((y) => {
                const isActive = String(y) === yyyy;
                return (
                  <button
                    key={y}
                    type="button"
                    data-active={isActive}
                    onMouseDown={(e) => {
                      e.preventDefault(); // prevent blur firing first
                      handleYearSelect(y);
                    }}
                    className={`w-full text-center py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-[#32C8D1] text-white font-bold"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Inline validation messages */}
      {underAge && (
        <p className="text-sm text-red-600 mt-1.5 font-medium">
          Must be at least {minAge} years old.
        </p>
      )}
      {incompleteDate && !underAge && (
        <p className="text-sm text-red-600 mt-1.5 font-medium">
          Please enter a complete and valid date.
        </p>
      )}

      {/* Subtle helper when untouched */}
      {!touched && !value && (
        <p className="text-xs text-gray-400 mt-1">
          Enter month, day, then year
        </p>
      )}
    </div>
  );
}

export default DobInput;

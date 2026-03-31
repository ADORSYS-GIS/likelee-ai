import React, { useEffect, useMemo, useRef, useState } from "react";
import { parseDobSegments, isAtLeastAge } from "@/lib/dob";

type DobInputProps = {
  value: string;
  onChange: (value: string) => void;
  minAge?: number;
  required?: boolean;
  error?: string;
  id?: string;
  name?: string;
  className?: string;
  inputClassName?: string;
};

const segmentClass =
  "h-12 w-16 rounded-md border border-gray-300 bg-white text-center text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30";

export default function DobInput({
  value,
  onChange,
  minAge = 18,
  required = false,
  error,
  id,
  name,
  className,
  inputClassName,
}: DobInputProps) {
  const [mm, setMm] = useState("");
  const [dd, setDd] = useState("");
  const [yyyy, setYyyy] = useState("");
  const [touched, setTouched] = useState(false);

  const mmRef = useRef<HTMLInputElement>(null);
  const ddRef = useRef<HTMLInputElement>(null);
  const yyyyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!value) {
      setMm("");
      setDd("");
      setYyyy("");
      return;
    }
    const [year, month, day] = value.split("-");
    if (year && month && day) {
      setMm(month);
      setDd(day);
      setYyyy(year);
    }
  }, [value]);

  const validation = useMemo(() => {
    if (!mm && !dd && !yyyy) {
      return {
        isComplete: false,
        isValidDate: !required,
        isOldEnough: true,
      };
    }
    if (mm.length < 2 || dd.length < 2 || yyyy.length < 4) {
      return {
        isComplete: false,
        isValidDate: false,
        isOldEnough: true,
      };
    }
    const parsed = parseDobSegments(mm, dd, yyyy);
    if (!parsed.isValidDate) {
      return {
        isComplete: true,
        isValidDate: false,
        isOldEnough: true,
      };
    }
    return {
      isComplete: true,
      isValidDate: true,
      isOldEnough: isAtLeastAge(parsed.iso, minAge),
      iso: parsed.iso,
    };
  }, [mm, dd, yyyy, minAge, required]);

  useEffect(() => {
    if (!validation.isComplete) {
      if (!mm && !dd && !yyyy) {
        onChange("");
      }
      return;
    }
    if (validation.isValidDate && validation.isOldEnough && validation.iso) {
      onChange(validation.iso);
    } else {
      onChange("");
    }
  }, [
    validation.isComplete,
    validation.isValidDate,
    validation.isOldEnough,
    validation.iso,
    mm,
    dd,
    yyyy,
    onChange,
  ]);

  const handleSegmentChange = (
    setter: (value: string) => void,
    nextRef: React.RefObject<HTMLInputElement>,
    maxLength: number,
  ) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setTouched(true);
      const digitsOnly = e.target.value.replace(/\D/g, "");
      const clipped = digitsOnly.slice(0, maxLength);
      setter(clipped);
      if (clipped.length === maxLength && nextRef.current) {
        nextRef.current.focus();
      }
    };
  };

  const handleBackspace =
    (currentValue: string, prevRef?: React.RefObject<HTMLInputElement>) =>
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !currentValue && prevRef?.current) {
        prevRef.current.focus();
      }
    };

  const showError =
    error ||
    (touched &&
      ((required && !mm && !dd && !yyyy) ||
        (validation.isComplete && !validation.isValidDate) ||
        (validation.isComplete &&
          validation.isValidDate &&
          !validation.isOldEnough)));

  const errorMessage =
    error ||
    (required && !mm && !dd && !yyyy
      ? "Date of birth is required."
      : validation.isComplete && !validation.isValidDate
        ? "Enter a valid date."
        : validation.isComplete &&
            validation.isValidDate &&
            !validation.isOldEnough
          ? `Must be at least ${minAge} years old.`
          : "");

  const mergedSegmentClass = `${segmentClass} ${inputClassName || ""}`.trim();
  const mergedYearClass =
    `h-12 w-24 rounded-md border border-gray-300 bg-white text-center text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${inputClassName || ""}`.trim();

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <input
          ref={mmRef}
          id={id}
          name={name ? `${name}-mm` : undefined}
          value={mm}
          onChange={handleSegmentChange(setMm, ddRef, 2)}
          onBlur={() => setTouched(true)}
          onKeyDown={handleBackspace(mm)}
          placeholder="MM"
          inputMode="numeric"
          pattern="[0-9]*"
          type="text"
          className={mergedSegmentClass}
          aria-label="Month"
        />
        <span className="text-gray-500">/</span>
        <input
          ref={ddRef}
          name={name ? `${name}-dd` : undefined}
          value={dd}
          onChange={handleSegmentChange(setDd, yyyyRef, 2)}
          onBlur={() => setTouched(true)}
          onKeyDown={handleBackspace(dd, mmRef)}
          placeholder="DD"
          inputMode="numeric"
          pattern="[0-9]*"
          type="text"
          className={mergedSegmentClass}
          aria-label="Day"
        />
        <span className="text-gray-500">/</span>
        <input
          ref={yyyyRef}
          name={name ? `${name}-yyyy` : undefined}
          value={yyyy}
          onChange={handleSegmentChange(setYyyy, yyyyRef, 4)}
          onBlur={() => setTouched(true)}
          onKeyDown={handleBackspace(yyyy, ddRef)}
          placeholder="YYYY"
          inputMode="numeric"
          pattern="[0-9]*"
          type="text"
          className={mergedYearClass}
          aria-label="Year"
        />
      </div>
      {showError ? (
        <p className="mt-2 text-sm text-red-600 font-medium">{errorMessage}</p>
      ) : null}
    </div>
  );
}

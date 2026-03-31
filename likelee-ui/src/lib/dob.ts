export type DobParseResult = {
  iso: string;
  isValidDate: boolean;
};

const pad2 = (value: string) => value.padStart(2, "0");

export const parseDobSegments = (
  mm: string,
  dd: string,
  yyyy: string,
): DobParseResult => {
  const month = Number(mm);
  const day = Number(dd);
  const year = Number(yyyy);

  if (
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(year)
  ) {
    return { iso: "", isValidDate: false };
  }

  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1) {
    return { iso: "", isValidDate: false };
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  if (day > daysInMonth) {
    return { iso: "", isValidDate: false };
  }

  const iso = `${year}-${pad2(String(month))}-${pad2(String(day))}`;
  return { iso, isValidDate: true };
};

export const isAtLeastAge = (isoDate: string, minAge: number): boolean => {
  if (!isoDate) return false;
  const birth = new Date(isoDate);
  if (Number.isNaN(birth.getTime())) return false;
  const today = new Date();
  const age =
    today.getFullYear() -
    birth.getFullYear() -
    (today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
      ? 1
      : 0);
  return Number.isFinite(age) && age >= minAge;
};

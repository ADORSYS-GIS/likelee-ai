export const formatKycReason = (reason?: string | null) => {
  const value = String(reason ?? "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (!value) return "";

  const looksLikeCode = /^[A-Z0-9 ]+$/.test(value);
  if (!looksLikeCode) return value;

  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

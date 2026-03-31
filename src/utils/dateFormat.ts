/**
 * Format a date string to Arabic Gregorian format using UTC timezone
 */
export const formatDateAr = (dateStr: string | Date | null | undefined): string => {
  try {
    if (!dateStr) return "—";
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    if (isNaN(date.getTime())) return "—";
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
  } catch {
    return "—";
  }
};

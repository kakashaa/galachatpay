/**
 * Format a date string to Arabic Gregorian format (not Hijri)
 * Uses ar-EG locale which defaults to Gregorian calendar
 */
export const formatDateAr = (dateStr: string | Date): string => {
  try {
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    return date.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return "—";
  }
};

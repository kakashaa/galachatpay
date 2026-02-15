/**
 * Resolves the effective user type from API response.
 * 
 * The external API returns `type_user` directly:
 * 
 * - type_user=0 → مستخدم عادي (regular user)
 * - type_user=1 → مضيف (host)
 * - type_user=2 → وكيل مضيفين (agent of hosts)
 * - type_user=3 → وكيل شحن (charging agent)
 * - type_user=4 → وكيل شحن ومضيفين (charging + hosts agent)
 * - type_user=5 → وكيل شحن ومضيف (charging agent + host)
 * - type_user=6 → الكل (all roles)
 */
export function resolveUserType(
  rawTypeUser: number | string | null | undefined,
  _agency?: unknown,
  fallback: number = 0
): number {
  if (rawTypeUser !== undefined && rawTypeUser !== null) {
    return Number(rawTypeUser);
  }
  return fallback;
}

/** Labels for each user type */
export const userTypeLabels: Record<number, string> = {
  0: "مستخدم عادي",
  1: "مضيف",
  2: "وكيل مضيفين",
  3: "وكيل شحن",
  4: "وكيل شحن ومضيفين",
  5: "وكيل شحن ومضيف",
  6: "الكل",
};

/**
 * Resolves the effective user type from API response.
 * 
 * The external API returns `type_user` which may not reflect agency status.
 * We combine `type_user` with the `agency` object to determine the real role:
 * 
 * - type_user=0/1 → مستخدم عادي (regular user)
 * - type_user=2, no agency → مضيف (host)
 * - type_user=2, has agency → وكيل مضيفين (agent of hosts) = 3
 * - type_user=4, no agency → وكيل شحن (charging agent)
 * - type_user=4, has agency → وكيل شحن ومضيفين (charging + hosts agent) = 5
 * - type_user=6 → مضيف ووكيل شحن (host + charging agent)
 */
export function resolveUserType(
  rawTypeUser: number | string | null | undefined,
  agency: { id?: number | string } | null | undefined,
  fallback: number = 0
): number {
  const raw = rawTypeUser !== undefined && rawTypeUser !== null
    ? Number(rawTypeUser)
    : fallback;

  const hasAgency = !!(agency && agency.id);

  if (!hasAgency) return raw;

  // User has agency — upgrade type
  switch (raw) {
    case 2: return 3;  // مضيف → وكيل مضيفين
    case 4: return 5;  // وكيل شحن → وكيل شحن ومضيفين
    default: return raw;
  }
}

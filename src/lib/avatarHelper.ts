const AVATAR_CACHE: Record<string, string> = {};
const API = "https://galachat.site/project-z/api.php";

const DEFAULT_AVATAR = "/placeholder.svg";

/** Build the correct avatar URL from uuid + optional avatar path */
export function getAvatarUrl(uuid: string, avatar?: string | null): string {
  if (avatar && avatar.startsWith("http")) return avatar;
  if (avatar) return `https://media.galalivechat.com/${avatar}`;
  return `https://media.galalivechat.com/avatars/default.jpg`;
}

/** onError handler for avatar images — falls back to default */
export function handleAvatarError(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.src = DEFAULT_AVATAR;
  e.currentTarget.onerror = null; // prevent loop
}

export async function getAvatar(uuid: string): Promise<string> {
  if (!uuid) return DEFAULT_AVATAR;

  // Check memory cache
  if (AVATAR_CACHE[uuid]) return AVATAR_CACHE[uuid];

  // Check localStorage cache
  const cached = localStorage.getItem(`avatar_${uuid}`);
  if (cached) {
    AVATAR_CACHE[uuid] = cached;
    return cached;
  }

  // Fetch from API
  try {
    const res = await fetch(`${API}?action=get_avatar&uuid=${uuid}`);
    const data = await res.json();
    if (data.success && data.avatar) {
      const url = getAvatarUrl(uuid, data.avatar);
      AVATAR_CACHE[uuid] = url;
      localStorage.setItem(`avatar_${uuid}`, url);
      return url;
    }
  } catch {
    // silent
  }

  return getAvatarUrl(uuid);
}

// Legacy helper — kept for backward compat
export function fixAvatarUrl(path?: string | null): string {
  if (!path) return DEFAULT_AVATAR;
  if (path.startsWith("http")) return path;
  if (path.startsWith("avatars/")) return `https://media.galalivechat.com/${path}`;
  return `https://media.galalivechat.com/${path}`;
}

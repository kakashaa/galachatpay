const AVATAR_CACHE: Record<string, string> = {};
const API = "https://galachat.site/project-z/api.php";

/** Build the correct avatar URL from uuid + optional avatar path */
export function getAvatarUrl(uuid: string, avatar?: string | null): string {
  if (avatar && avatar.startsWith("http")) return avatar;
  if (avatar) return `https://storage.googleapis.com/galalivechat-bucket-01/avatars/${avatar}`;
  return `https://galalivechat.com/api/newWebsite/user/avatar?uuid=${uuid}`;
}

export async function getAvatar(uuid: string): Promise<string> {
  if (!uuid) return "";

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
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (path.startsWith("avatars/")) return `https://storage.googleapis.com/galalivechat-bucket-01/${path}`;
  return `https://storage.googleapis.com/galalivechat-bucket-01/avatars/${path}`;
}

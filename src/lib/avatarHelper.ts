import { galaApi } from "@/services/galaApi";
import { API_URLS } from "@/config/api";

const AVATAR_CACHE: Record<string, string> = {};

const DEFAULT_AVATAR = "/placeholder.svg";

const OLD_BUCKET = "storage.googleapis.com/galalivechat-bucket-01";

/** Normalize any avatar URL to use the fast media domain */
function normalizeMediaUrl(url: string): string {
  return url.replace(`https://${OLD_BUCKET}/`, API_URLS.MEDIA);
}

/** Build the correct avatar URL from uuid + optional avatar path */
export function getAvatarUrl(uuid: string, avatar?: string | null): string {
  if (avatar && avatar.startsWith("http")) return normalizeMediaUrl(avatar);
  if (avatar) return `${API_URLS.MEDIA}${avatar}`;
  return `${API_URLS.MEDIA}avatars/default.jpg`;
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

  // Fetch from API via proxy
  try {
    const data = await galaApi.getAvatar(uuid) as any;
    if (data.success && data.avatar) {
      const url = getAvatarUrl(uuid, data.avatar);
      AVATAR_CACHE[uuid] = url;
      localStorage.setItem(`avatar_${uuid}`, url);
      return url;
    }
  } catch {
    // silent
  }

  return `${API_URLS.MEDIA}avatars/default.jpg`;
}

// Legacy helper — kept for backward compat
export function fixAvatarUrl(path?: string | null): string {
  if (!path) return DEFAULT_AVATAR;
  if (path.startsWith("http")) return normalizeMediaUrl(path);
  return `${API_URLS.MEDIA}${path}`;
}

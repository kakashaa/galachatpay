import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { API_URLS } from "@/config/api";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAvatarUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path.replace("https://storage.googleapis.com/galalivechat-bucket-01/", API_URLS.MEDIA);
  return `${API_URLS.MEDIA}${path}`;
}

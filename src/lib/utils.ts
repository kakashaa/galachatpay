import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAvatarUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `https://media.galalivechat.com/${path}`;
}

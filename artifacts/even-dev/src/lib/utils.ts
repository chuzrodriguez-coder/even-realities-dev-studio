import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatHex(hex?: string) {
  if (!hex) return "";
  // Insert space every 2 characters if it's a continuous hex string
  return hex.replace(/([0-9A-Fa-f]{2})/g, "$1 ").trim();
}

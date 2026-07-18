import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function cleanAndParseJSON(text: string): any {
  let cleaned = text.trim();
  // Strip markdown code block wrappers if present (e.g. ```json ... ``` or ``` ... ```)
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n/, "").replace(/\n```$/, "").trim();
  }
  return JSON.parse(cleaned);
}

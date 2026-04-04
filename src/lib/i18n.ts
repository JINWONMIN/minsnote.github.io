import ko from "@/locales/ko.json";
import en from "@/locales/en.json";
import termMap from "@/locales/term-map.json";

const dictionaries = { ko, en } as const;

export type Locale = "ko" | "en";
export type Dictionary = typeof ko;

export const locales: Locale[] = ["ko", "en"];
export const defaultLocale: Locale = "ko";

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}

export function getLocaleLabel(locale: Locale): string {
  return locale === "ko" ? "KO" : "EN";
}

const koToEn = termMap.koToEn as Record<string, string>;
const enToKo = termMap.enToKo as Record<string, string>;

export function translateTerm(term: string, from: Locale, to: Locale): string {
  if (from === to) return term;
  if (from === "ko") return koToEn[term] ?? term;
  return enToKo[term] ?? term;
}

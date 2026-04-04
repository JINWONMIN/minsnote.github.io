import { type Locale } from "./i18n";

const localeMap: Record<Locale, string> = {
  ko: "ko-KR",
  en: "en-US",
};

export function formatDate(dateString: string, locale: Locale = "ko"): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(localeMap[locale], {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

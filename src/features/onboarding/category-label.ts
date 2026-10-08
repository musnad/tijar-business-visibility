import type { BusinessCategory } from "@/types/database";

export function categoryDisplayName(cat: BusinessCategory, t: (key: string) => string): string {
  const key = `onboarding.categories.${cat.slug}`;
  const translated = t(key);
  if (translated !== key && translated.length > 0) {
    return translated;
  }
  return cat.name;
}

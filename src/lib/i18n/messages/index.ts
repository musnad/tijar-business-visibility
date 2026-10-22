import type { Locale } from "../types";
import type { MessageTree } from "../types";
import { deepMergeMessages } from "../merge-messages";
import { getFullTranslationOverlay } from "../translations";
import { getAppCoreTranslationOverlay } from "./app-core-translations";
import { getCustomersTranslationOverlay } from "./customers-translations";
import { getOnboardingTranslationOverlay } from "./onboarding-translations";
import { discoverI18n } from "./discover-i18n";
import { enMessages } from "./en";
import { moderationI18n } from "./moderation-i18n";
import { publishI18n } from "./publish-i18n";
import { storefrontI18n } from "./storefront-i18n";
import { translatorI18n } from "./translator-i18n";
import { voiceOnboardingI18n } from "./voice-onboarding-i18n";

import { arMessages } from "./ar";
import { ffMessages } from "./ff";
import { haMessages } from "./ha";
import { igMessages } from "./ig";
import { swMessages } from "./sw";
import { yoMessages } from "./yo";

function withLocaleOverlays(base: MessageTree, locale: Locale): MessageTree {
  let tree = deepMergeMessages(base, getOnboardingTranslationOverlay(locale));
  tree = deepMergeMessages(tree, getCustomersTranslationOverlay(locale));
  tree = deepMergeMessages(tree, getAppCoreTranslationOverlay(locale));
  tree = deepMergeMessages(tree, getFullTranslationOverlay(locale));
  // Section bundles (pages that were originally hard-coded English).
  tree = deepMergeMessages(tree, discoverI18n[locale]);
  tree = deepMergeMessages(tree, storefrontI18n[locale]);
  tree = deepMergeMessages(tree, publishI18n[locale]);
  tree = deepMergeMessages(tree, moderationI18n[locale]);
  tree = deepMergeMessages(tree, translatorI18n[locale]);
  tree = deepMergeMessages(tree, voiceOnboardingI18n[locale]);
  return tree;
}

export const messages: Record<Locale, MessageTree> = {
  en: withLocaleOverlays(enMessages, "en"),
  ha: withLocaleOverlays(haMessages, "ha"),
  ar: withLocaleOverlays(arMessages, "ar"),
  yo: withLocaleOverlays(yoMessages, "yo"),
  ig: withLocaleOverlays(igMessages, "ig"),
  sw: withLocaleOverlays(swMessages, "sw"),
  ff: withLocaleOverlays(ffMessages, "ff"),
};

export type Messages = typeof enMessages;

import type { Locale } from "../types";
import type { MessageTree } from "../types";
import { deepMergeMessages } from "../merge-messages";
import { getCustomersTranslationOverlay } from "./customers-translations";
import { getOnboardingTranslationOverlay } from "./onboarding-translations";
import { enMessages } from "./en";

import { arMessages } from "./ar";
import { ffMessages } from "./ff";
import { haMessages } from "./ha";
import { igMessages } from "./ig";
import { swMessages } from "./sw";
import { yoMessages } from "./yo";

function withLocaleOverlays(base: MessageTree, locale: Locale): MessageTree {
  let tree = deepMergeMessages(base, getOnboardingTranslationOverlay(locale));
  tree = deepMergeMessages(tree, getCustomersTranslationOverlay(locale));
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

import type { Locale } from "../types";
import type { MessageTree } from "../types";
import { enMessages } from "./en";

import { arMessages } from "./ar";
import { haMessages } from "./ha";
import { igMessages } from "./ig";
import { swMessages } from "./sw";
import { yoMessages } from "./yo";

export const messages: Record<Locale, MessageTree> = {
  en: enMessages,
  ha: haMessages,
  ar: arMessages,
  yo: yoMessages,
  ig: igMessages,
  sw: swMessages,
};

export type Messages = typeof enMessages;

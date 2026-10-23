/**
 * Rule-based voice/text command parser for "Talk to TIJAR".
 * Converts natural commands into a DRAFT transaction. Nothing is saved
 * until the user confirms the draft (no silent writes).
 *
 * Examples:
 *  "add record sale 5000 for rice"      -> sale 5000 "rice"
 *  "I made a sale of 5000"              -> sale 5000
 *  "record expense 2000 transport"      -> expense 2000 "transport"
 *  "I sold 2 bags of rice for 45000"    -> sale 45000 "2 bags of rice"
 *  "bought stock 30000"                 -> purchase 30000
 *  "customer paid me 5000"              -> customer_payment 5000
 *  "Mo ta iresi fun 5000" / "Nimeuza..." -> sale (with EN translate hint)
 */

export type VoiceIntentType = "sale" | "expense" | "purchase" | "customer_payment" | "supplier_payment";

export type ParsedVoiceCommand = {
  intent: VoiceIntentType | "unknown";
  amount: number | null;
  description: string;
  raw: string;
  confidence: "high" | "low";
};

const AMOUNT_RE = /(\d{1,3}(?:[,\s]\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*(k|thousand|million|m)?\b/i;

/** Strong sale markers — checked before purchase so "sold stock" is a sale. */
const SALE_MARKERS =
  /\b(sold|sale|sell|selling|sales)\b|made\s+(a\s+|an\s+)?sale|make\s+(a\s+|an\s+)?sale|record(ed)?\s+(a\s+|an\s+)?sale|got\s+(a\s+|an\s+)?sale|new\s+sale|i\s+don\s+sell|don\s+sell|customer\s+buy|kuuza|nimeuza|niliuza|niluuza|umeuza|sayar|\buza\b|\btita\b|mo\s+ta\b|mo\s+se\s+tita|mo\s+ṣe\s+tita|na\s+sayar/i;

const INTENT_PATTERNS: { intent: VoiceIntentType; patterns: RegExp[] }[] = [
  {
    intent: "customer_payment",
    patterns: [
      /customer (paid|pay)/i,
      /debt (paid|payment)/i,
      /received payment/i,
      /akulipa/i,
      /malipo ya mteja/i,
      /customer don pay/i,
    ],
  },
  {
    intent: "supplier_payment",
    patterns: [/paid (the )?supplier/i, /supplier payment/i, /niliplipa/i],
  },
  {
    intent: "expense",
    patterns: [
      /\b(expense|spent|spend|paid for|transport|fuel|rent)\b/i,
      /gharama/i,
      /\bkashe\b/i,
      /matumizi/i,
      /i\s+spend/i,
    ],
  },
  {
    intent: "purchase",
    patterns: [
      /\b(bought|buy|purchased|purchase|restock)\b/i,
      /\bstock\b/i,
      /kununua/i,
      /\bsaye\b/i,
      /i\s+don\s+buy/i,
    ],
  },
  {
    intent: "sale",
    patterns: [SALE_MARKERS],
  },
];

const FILLER_RE =
  /\b(add record|record|add|please|tijar|i|today|for|of|the|a|an|me|my|naira|ngn|₦|made|make|got|new)\b/gi;

const INTENT_WORD_RE =
  /\b(sold|sale|sell|selling|sales|bought|buy|purchased|purchase|expense|spent|spend|restock|stock)\b/gi;

function amountValue(num: string, suffix?: string): number {
  let value = Number.parseFloat(num.replace(/[,\s]/g, ""));
  const s = suffix?.toLowerCase();
  if (s === "k" || s === "thousand") value *= 1_000;
  if (s === "million" || s === "m") value *= 1_000_000;
  return Math.round(value * 100) / 100;
}

export function parseAmount(text: string): number | null {
  // Prefer the amount after "for" / "of" ("sold … for 45000", "sale of 5000").
  const forMatch = text.match(
    new RegExp(`(?:for|of)\\s+(?:₦|ngn|naira\\s*)?${AMOUNT_RE.source}`, "i"),
  );
  if (forMatch?.[1]) return amountValue(forMatch[1], forMatch[2]);
  const all = [...text.matchAll(new RegExp(AMOUNT_RE.source, "gi"))]
    .map((m) => (m[1] ? amountValue(m[1], m[2]) : NaN))
    .filter((v) => Number.isFinite(v));
  if (all.length === 0) return null;
  return Math.max(...all);
}

function detectIntent(text: string): ParsedVoiceCommand["intent"] {
  // Sale wins over purchase when both could match ("sold stock", "sayar").
  if (SALE_MARKERS.test(text)) return "sale";
  for (const group of INTENT_PATTERNS) {
    if (group.intent === "sale") continue;
    if (group.patterns.some((p) => p.test(text))) return group.intent;
  }
  return "unknown";
}

function cleanDescription(raw: string): string {
  let description = raw
    .replace(new RegExp(AMOUNT_RE.source, "gi"), " ")
    .replace(FILLER_RE, " ")
    .replace(INTENT_WORD_RE, " ")
    .replace(SALE_MARKERS, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (description.length > 80) description = description.slice(0, 80);
  return description;
}

export function parseVoiceCommand(rawInput: string): ParsedVoiceCommand {
  const raw = rawInput.trim();
  const text = raw.toLowerCase();
  const intent = detectIntent(text);
  const amount = parseAmount(text);
  const description = cleanDescription(raw);

  return {
    intent,
    amount,
    description,
    raw,
    confidence: intent !== "unknown" && amount !== null && amount > 0 ? "high" : "low",
  };
}

/**
 * Prefer an English translation when the user spoke another language.
 * Keeps the original transcript as `raw` for the conversation thread.
 */
export function parseVoiceCommandWithHint(
  original: string,
  englishHint?: string | null,
): ParsedVoiceCommand {
  const fromOriginal = parseVoiceCommand(original);
  const hint = englishHint?.trim();
  if (!hint || hint.toLowerCase() === original.trim().toLowerCase()) {
    return fromOriginal;
  }

  const fromEnglish = parseVoiceCommand(hint);

  if (fromEnglish.confidence === "high") {
    return {
      ...fromEnglish,
      raw: original.trim(),
      description: fromEnglish.description || fromOriginal.description,
    };
  }

  if (fromOriginal.intent === "unknown" && fromEnglish.intent !== "unknown") {
    return {
      ...fromEnglish,
      raw: original.trim(),
      amount: fromEnglish.amount ?? fromOriginal.amount,
      description: fromEnglish.description || fromOriginal.description,
      confidence:
        fromEnglish.amount !== null && fromEnglish.amount > 0 ? "high" : "low",
    };
  }

  if (
    fromOriginal.intent !== "unknown" &&
    fromOriginal.amount == null &&
    fromEnglish.amount != null
  ) {
    return {
      ...fromOriginal,
      amount: fromEnglish.amount,
      confidence: "high",
      description: fromOriginal.description || fromEnglish.description,
    };
  }

  return fromOriginal;
}

/** Apply a follow-up amount (spoken or typed) onto an existing draft. */
export function withAmount(cmd: ParsedVoiceCommand, amount: number): ParsedVoiceCommand {
  if (!Number.isFinite(amount) || amount <= 0) return cmd;
  return {
    ...cmd,
    amount,
    confidence: cmd.intent !== "unknown" ? "high" : "low",
  };
}

export type DraftSummaryStrings = {
  unknown: string;
  /** Template with {label}, {amount}, {description} placeholders. */
  text: string;
  /** When intent is known but amount is missing. */
  needAmount?: string;
  labels: Record<VoiceIntentType, string>;
};

const DEFAULT_SUMMARY_STRINGS: DraftSummaryStrings = {
  unknown: "I could not understand the amount or type. Try: 'Record sale 5000 for rice'.",
  text: "{label} of {amount}{description}. Press Confirm to save.",
  needAmount: "{label} — how much? Say or type the amount, then Confirm.",
  labels: {
    sale: "Sale",
    expense: "Expense",
    purchase: "Purchase (stock)",
    customer_payment: "Customer payment",
    supplier_payment: "Supplier payment",
  },
};

/** Spoken-style confirmation summary (also shown as text). */
export function summarizeDraft(
  cmd: ParsedVoiceCommand,
  strings: DraftSummaryStrings = DEFAULT_SUMMARY_STRINGS,
): string {
  if (cmd.intent === "unknown") {
    return strings.unknown;
  }
  if (cmd.amount === null || cmd.amount <= 0) {
    return (strings.needAmount ?? DEFAULT_SUMMARY_STRINGS.needAmount!)
      .replace("{label}", strings.labels[cmd.intent]);
  }
  return strings.text
    .replace("{label}", strings.labels[cmd.intent])
    .replace("{amount}", `₦${cmd.amount.toLocaleString("en-NG")}`)
    .replace("{description}", cmd.description ? ` — ${cmd.description}` : "");
}

/**
 * Rule-based voice/text command parser for "Talk to TIJAR".
 * Converts natural commands into a DRAFT transaction. Nothing is saved
 * until the user confirms the draft (no silent writes).
 *
 * Examples:
 *  "add record sale 5000 for rice"      -> sale 5000 "rice"
 *  "record expense 2000 transport"      -> expense 2000 "transport"
 *  "I sold 2 bags of rice for 45000"    -> sale 45000 "2 bags of rice"
 *  "bought stock 30000"                 -> purchase 30000
 *  "customer paid me 5000"              -> customer_payment 5000
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

const INTENT_PATTERNS: { intent: VoiceIntentType; patterns: RegExp[] }[] = [
  {
    intent: "customer_payment",
    patterns: [/customer (paid|pay)/i, /debt (paid|payment)/i, /received payment/i, /akulipa/i, /malipo ya mteja/i],
  },
  {
    intent: "supplier_payment",
    patterns: [/paid (the )?supplier/i, /supplier payment/i, /niliplipa/i],
  },
  {
    intent: "purchase",
    patterns: [/\b(bought|buy|purchased|purchase|restock|stock)\b/i, /kununua/i, /saye/i],
  },
  {
    intent: "expense",
    patterns: [/\b(expense|spent|spend|paid for|transport|fuel|rent)\b/i, /gharama/i, /kashe/i, /matumizi/i],
  },
  {
    intent: "sale",
    patterns: [/\b(sold|sale|sell|sold)\b/i, /kuuza/i, /sayar/i, /uza/i],
  },
];

const FILLER_RE =
  /\b(add record|record|add|please|tijar|i|today|for|of|the|a|an|me|my|naira|ngn|₦)\b/gi;

function amountValue(num: string, suffix?: string): number {
  let value = Number.parseFloat(num.replace(/[,\s]/g, ""));
  const s = suffix?.toLowerCase();
  if (s === "k" || s === "thousand") value *= 1_000;
  if (s === "million" || s === "m") value *= 1_000_000;
  return Math.round(value * 100) / 100;
}

export function parseAmount(text: string): number | null {
  // Prefer the amount after "for" ("sold 2 bags for 45000"), else the largest.
  const forMatch = text.match(new RegExp(`for\\s+(?:₦|ngn|naira\\s*)?${AMOUNT_RE.source}`, "i"));
  if (forMatch?.[1]) return amountValue(forMatch[1], forMatch[2]);
  const all = [...text.matchAll(new RegExp(AMOUNT_RE.source, "gi"))]
    .map((m) => (m[1] ? amountValue(m[1], m[2]) : NaN))
    .filter((v) => Number.isFinite(v));
  if (all.length === 0) return null;
  return Math.max(...all);
}

export function parseVoiceCommand(rawInput: string): ParsedVoiceCommand {
  const raw = rawInput.trim();
  const text = raw.toLowerCase();

  let intent: ParsedVoiceCommand["intent"] = "unknown";
  for (const group of INTENT_PATTERNS) {
    if (group.patterns.some((p) => p.test(text))) {
      intent = group.intent;
      break;
    }
  }

  const amount = parseAmount(text);

  let description = raw
    .replace(new RegExp(AMOUNT_RE.source, "gi"), " ")
    .replace(FILLER_RE, " ")
    .replace(/\b(sold|sale|sell|bought|buy|purchased|purchase|expense|spent|spend)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (description.length > 80) description = description.slice(0, 80);

  return {
    intent,
    amount,
    description,
    raw,
    confidence: intent !== "unknown" && amount !== null && amount > 0 ? "high" : "low",
  };
}

/** Spoken-style confirmation summary (also shown as text). */
export function summarizeDraft(cmd: ParsedVoiceCommand): string {
  if (cmd.intent === "unknown" || cmd.amount === null) {
    return "I could not understand the amount or type. Try: 'Record sale 5000 for rice'.";
  }
  const labels: Record<VoiceIntentType, string> = {
    sale: "Sale",
    expense: "Expense",
    purchase: "Purchase (stock)",
    customer_payment: "Customer payment",
    supplier_payment: "Supplier payment",
  };
  return `${labels[cmd.intent]} of ₦${cmd.amount.toLocaleString("en-NG")}${cmd.description ? ` — ${cmd.description}` : ""}. Press Confirm to save.`;
}

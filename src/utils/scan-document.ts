/**
 * Turn OCR / pasted document text into a draft transaction.
 * Reuses Talk books intent parsing; adds receipt-style TOTAL / Amount heuristics.
 * Nothing is saved until the user confirms.
 */

import {
  parseAmount,
  parseVoiceCommand,
  type ParsedVoiceCommand,
  type VoiceIntentType,
} from "./voice-intent";

export type ScanDraft = {
  intent: VoiceIntentType | "unknown";
  amount: number | null;
  description: string;
  rawText: string;
  confidence: "high" | "low";
  source: "intent" | "total" | "line" | "none";
};

const TOTAL_RE =
  /(?:total|amount|amt|sum|grand\s*total|balance\s*due|paid|₦|ngn)\s*[:\-]?\s*(?:₦|ngn|naira)?\s*(\d{1,3}(?:[,\s]\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/i;

const LINE_RE =
  /^(.+?)\s+[-–:]?\s*(?:₦|ngn)?\s*(\d{1,3}(?:[,\s]\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*$/i;

function normalizeOcrText(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function amountFromMatch(raw: string): number {
  return Number.parseFloat(raw.replace(/[,\s]/g, ""));
}

function intentFromText(text: string): VoiceIntentType | "unknown" {
  const cmd = parseVoiceCommand(text);
  if (cmd.intent !== "unknown") return cmd.intent;
  if (/\b(expense|spent|spend|transport|fuel|rent|gharama|matumizi)\b/i.test(text)) return "expense";
  if (/\b(bought|purchase|stock|restock|kununua)\b/i.test(text)) return "purchase";
  if (/\b(sale|sold|sell|receipt|invoice|sales|tita|uza)\b/i.test(text)) return "sale";
  return "unknown";
}

function descriptionFromLines(lines: string[], amount: number | null): string {
  const skip = /^(total|amount|subtotal|tax|vat|date|tel|phone|thank|receipt|invoice)\b/i;
  for (const line of lines) {
    const cleaned = line.replace(/(?:₦|ngn)?\s*[\d,]+(?:\.\d+)?/gi, " ").replace(/\s+/g, " ").trim();
    if (cleaned.length < 2 || skip.test(cleaned)) continue;
    if (amount !== null && cleaned.length > 1) return cleaned.slice(0, 80);
  }
  return "";
}

/**
 * Extract one draft transaction from scanned document text.
 */
export function parseScannedDocument(rawInput: string): ScanDraft {
  const rawText = rawInput.trim();
  if (!rawText) {
    return {
      intent: "unknown",
      amount: null,
      description: "",
      rawText: "",
      confidence: "low",
      source: "none",
    };
  }

  const normalized = normalizeOcrText(rawText);
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // 1) Full-text voice/intent parser (works for handwritten “sale 5000 rice”).
  const fromIntent = parseVoiceCommand(normalized);
  if (fromIntent.intent !== "unknown" && fromIntent.amount !== null && fromIntent.amount > 0) {
    return {
      intent: fromIntent.intent,
      amount: fromIntent.amount,
      description: fromIntent.description,
      rawText,
      confidence: fromIntent.confidence,
      source: "intent",
    };
  }

  // 2) Receipt TOTAL / Amount line.
  const totalMatch = rawText.match(TOTAL_RE) ?? normalized.match(TOTAL_RE);
  if (totalMatch?.[1]) {
    const amount = amountFromMatch(totalMatch[1]);
    if (Number.isFinite(amount) && amount > 0) {
      const detected = intentFromText(normalized);
      const resolved: VoiceIntentType = detected === "unknown" ? "sale" : detected;
      return {
        intent: resolved,
        amount,
        description: descriptionFromLines(lines, amount) || fromIntent.description,
        rawText,
        confidence: "high",
        source: "total",
      };
    }
  }

  // 3) Last line that looks like “item 5000”.
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line) continue;
    const m = line.match(LINE_RE);
    if (!m?.[1] || !m[2]) continue;
    const amount = amountFromMatch(m[2]);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const label = m[1].replace(/[-–:]+$/, "").trim();
    const lineIntent = intentFromText(`${label} ${line}`);
    const intent: VoiceIntentType =
      fromIntent.intent !== "unknown"
        ? fromIntent.intent
        : lineIntent !== "unknown"
          ? lineIntent
          : "sale";
    return {
      intent,
      amount,
      description: (label && !/^(total|amount)$/i.test(label) ? label : fromIntent.description).slice(0, 80),
      rawText,
      confidence: "low",
      source: "line",
    };
  }

  // 4) Any amount + best-effort intent (default sale for shop receipts).
  const amount = fromIntent.amount ?? parseAmount(normalized);
  if (amount !== null && amount > 0) {
    const detected = intentFromText(normalized);
    const intent: VoiceIntentType =
      fromIntent.intent !== "unknown"
        ? fromIntent.intent
        : detected === "unknown"
          ? "sale"
          : detected;
    return {
      intent,
      amount,
      description: fromIntent.description || descriptionFromLines(lines, amount),
      rawText,
      confidence: "low",
      source: fromIntent.intent !== "unknown" ? "intent" : "total",
    };
  }

  return {
    intent: fromIntent.intent,
    amount: null,
    description: fromIntent.description,
    rawText,
    confidence: "low",
    source: "none",
  };
}

export function scanDraftToVoiceCommand(draft: ScanDraft): ParsedVoiceCommand {
  return {
    intent: draft.intent,
    amount: draft.amount,
    description: draft.description,
    raw: draft.rawText.slice(0, 200),
    confidence: draft.confidence,
  };
}

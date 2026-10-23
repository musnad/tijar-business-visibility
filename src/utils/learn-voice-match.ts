/**
 * Match a spoken answer to a multiple-choice option index.
 * Supports: "A"/"B"/"C", "option A", "first"/"second", or words from the option label.
 */

const LETTERS = ["a", "b", "c", "d", "e", "f"] as const;
const ORDINALS = [
  ["first", "1st", "one", "number one", "option one"],
  ["second", "2nd", "two", "number two", "option two"],
  ["third", "3rd", "three", "number three", "option three"],
  ["fourth", "4th", "four", "number four", "option four"],
  ["fifth", "5th", "five"],
  ["sixth", "6th", "six"],
] as const;

export function normalizeSpeakText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchSpokenOption(transcript: string, optionLabels: string[]): number | null {
  const text = normalizeSpeakText(transcript);
  if (!text || optionLabels.length === 0) return null;

  // Exact / letter: "a", "option a", "letter b"
  for (let i = 0; i < Math.min(optionLabels.length, LETTERS.length); i++) {
    const letter = LETTERS[i]!;
    const shortLetter =
      text === letter ||
      text === `option ${letter}` ||
      text === `letter ${letter}` ||
      text === `answer ${letter}` ||
      (text.length <= 14 && new RegExp(`\\b${letter}\\b`).test(text));
    if (shortLetter) return i;
  }

  for (let i = 0; i < Math.min(optionLabels.length, ORDINALS.length); i++) {
    // Exact ordinal / short phrases only — avoid "one" matching inside "one thousand…"
    if (ORDINALS[i]!.some((o) => text === o)) return i;
    if (text.split(" ").length <= 3) {
      if (ORDINALS[i]!.some((o) => new RegExp(`\\b${o.replace(/\s+/g, "\\s+")}\\b`).test(text))) {
        return i;
      }
    }
  }

  // Label overlap: pick option whose words are best covered by the transcript
  let best = -1;
  let bestScore = 0;
  for (let i = 0; i < optionLabels.length; i++) {
    const label = normalizeSpeakText(optionLabels[i] ?? "");
    if (!label) continue;
    if (text === label) return i;
    if (text.includes(label) || label.includes(text)) {
      const score = 1000 + label.length;
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
      continue;
    }
    const words = label.split(" ").filter((w) => w.length > 2);
    if (words.length === 0) continue;
    const hit = words.filter((w) => new RegExp(`\\b${w}\\b`).test(text)).length;
    const ratio = hit / words.length;
    const score = ratio * 100 + label.length / 100;
    if (ratio >= 0.75 && score > bestScore) {
      bestScore = score;
      best = i;
    }
  }

  return best >= 0 ? best : null;
}

/** True if the user said check / done / submit for multi-select. */
export function isSpokenSubmit(transcript: string): boolean {
  const text = normalizeSpeakText(transcript);
  return /\b(check|done|submit|finish|ready|ok|okay|confirm)\b/.test(text);
}

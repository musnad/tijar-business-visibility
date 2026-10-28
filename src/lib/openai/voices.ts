/** OpenAI TTS stock voices (used when no personal clone is available). */
export const OPENAI_TTS_VOICES = [
  "nova",
  "alloy",
  "echo",
  "fable",
  "onyx",
  "shimmer",
] as const;

export type OpenAiTtsVoice = (typeof OPENAI_TTS_VOICES)[number];

export function isOpenAiTtsVoice(value: string | null | undefined): value is OpenAiTtsVoice {
  return !!value && (OPENAI_TTS_VOICES as readonly string[]).includes(value);
}

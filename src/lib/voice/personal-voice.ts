/**
 * Client-side personal voice preferences.
 * Server TTS reads preferredVoice / customVoiceId from the speak request body
 * (never trust the browser for secrets — only for preference IDs).
 */

const VOICE_PREF_KEY = "tijar-tts-voice";
const CUSTOM_VOICE_KEY = "tijar-custom-voice-id";
const SAMPLE_PATH_KEY = "tijar-voice-sample-path";

export type PersonalVoicePrefs = {
  preferredTtsVoice: string | null;
  customVoiceId: string | null;
  voiceSamplePath: string | null;
};

export function readPersonalVoicePrefs(): PersonalVoicePrefs {
  if (typeof window === "undefined") {
    return { preferredTtsVoice: null, customVoiceId: null, voiceSamplePath: null };
  }
  try {
    return {
      preferredTtsVoice: localStorage.getItem(VOICE_PREF_KEY),
      customVoiceId: localStorage.getItem(CUSTOM_VOICE_KEY),
      voiceSamplePath: localStorage.getItem(SAMPLE_PATH_KEY),
    };
  } catch {
    return { preferredTtsVoice: null, customVoiceId: null, voiceSamplePath: null };
  }
}

export function writePersonalVoicePrefs(prefs: Partial<PersonalVoicePrefs>): void {
  if (typeof window === "undefined") return;
  try {
    if (prefs.preferredTtsVoice !== undefined) {
      if (prefs.preferredTtsVoice) localStorage.setItem(VOICE_PREF_KEY, prefs.preferredTtsVoice);
      else localStorage.removeItem(VOICE_PREF_KEY);
    }
    if (prefs.customVoiceId !== undefined) {
      if (prefs.customVoiceId) localStorage.setItem(CUSTOM_VOICE_KEY, prefs.customVoiceId);
      else localStorage.removeItem(CUSTOM_VOICE_KEY);
    }
    if (prefs.voiceSamplePath !== undefined) {
      if (prefs.voiceSamplePath) localStorage.setItem(SAMPLE_PATH_KEY, prefs.voiceSamplePath);
      else localStorage.removeItem(SAMPLE_PATH_KEY);
    }
  } catch {
    /* ignore quota / private mode */
  }
}

export const VOICE_ENROLL_SCRIPT =
  "Hello, my name is a shop owner. I sell goods every day. TIJAR helps me keep my books. One, two, three, four, five.";

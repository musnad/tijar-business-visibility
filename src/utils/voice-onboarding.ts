/**
 * Voice-guided onboarding ("create your profile by voice").
 * Questions are spoken in the user's language; answers are captured by
 * speech or tap. Pure parsing helpers — fully testable.
 *
 * Languages: English, Hausa, Swahili, Yoruba (browser speech engines).
 * Account creation (email/password) stays typed for security; this flow
 * creates the business profile after sign-in.
 */

export const VOICE_ONBOARDING_LANGS = ["English", "Hausa", "Swahili", "Yoruba"] as const;
export type VoiceOnboardingLang = (typeof VOICE_ONBOARDING_LANGS)[number];

export const LANG_TO_LOCALE: Record<VoiceOnboardingLang, string> = {
  English: "en",
  Hausa: "ha",
  Swahili: "sw",
  Yoruba: "yo",
};

type PromptKey =
  | "welcome"
  | "askName"
  | "askCategory"
  | "askLocation"
  | "askModel"
  | "askPayments"
  | "askCredit"
  | "askStock"
  | "askStaff"
  | "askDiscovery"
  | "askGoals"
  | "askIslamic"
  | "review"
  | "saved"
  | "tapFallback";

export const PROMPTS: Record<VoiceOnboardingLang, Record<PromptKey, string>> = {
  English: {
    welcome: "Welcome to TIJAR. I will help you create your business profile by voice. You can also tap answers on the screen.",
    askName: "What is the name of your business?",
    askCategory: "What type of business is it? Say the category name, or tap it below.",
    askLocation: "Where is your business located? Say your town or area.",
    askModel: "What do you mainly do? Say sell products, provide services, sell food, wholesale, or tap below.",
    askPayments: "How do customers pay you? Say cash, transfer, POS, credit, or mobile money. You can say more than one, then say done.",
    askCredit: "Do customers sometimes buy on credit and pay later? Say yes or no.",
    askStock: "Do you keep stock or products to sell? Say yes or no.",
    askStaff: "Do you have staff who work with you? Say yes or no.",
    askDiscovery: "How do customers find you? Say walk-in, WhatsApp, social media, referrals, market, or tap below.",
    askGoals: "What is your main goal? Say increase sales, more profit, manage expenses, manage debt, better records, or more customers. You can choose two.",
    askIslamic: "Do you want Islamic business mode? Say yes or no.",
    review: "Here is your business profile. Check it carefully. If it is correct, press Create my business.",
    saved: "Your business profile has been created. Welcome to TIJAR!",
    tapFallback: "I did not hear clearly. You can tap the answer below.",
  },
  Hausa: {
    welcome: "Barka da zuwa TIJAR. Zan taimaka maka ka ƙirƙiri bayanin kasuwancinka da murya. Hakanan zaka iya taɓa amsoshi a allon.",
    askName: "Menene sunan kasuwancinka?",
    askCategory: "Wane irin kasuwanci ne? Ka faɗi sunan rukuni, ko ka taɓa a ƙasa.",
    askLocation: "A ina kasuwancinka yake? Ka faɗi garinka ko unguwarka.",
    askModel: "Menene babban aikinka? Ka ce sayar da kaya, aiyuka, abinci, ko jumloli, ko ka taɓa a ƙasa.",
    askPayments: "Ta yaya abokan ciniki ke biyan ka? Ka ce kuɗi, transfer, POS, bashi, ko mobile money. Zaka iya faɗin fiye da ɗaya, sannan ka ce mun gama.",
    askCredit: "Shin abokan ciniki suna sayen bashi su biya daga baya? Ka ce ee ko a'a.",
    askStock: "Shin kana ajiye kaya don sayarwa? Ka ce ee ko a'a.",
    askStaff: "Shin kana da ma'aikata? Ka ce ee ko a'a.",
    askDiscovery: "Ta yaya abokan ciniki ke samun ka? Ka ce zuwa kai tsaye, WhatsApp, social media, shawarwari, kasuwa, ko ka taɓa a ƙasa.",
    askGoals: "Menene babban burinka? Ka ce ƙara tallace-tallace, ƙarin riba, sarrafa kuɗaɗen kashewa, sarrafa bashi, ingantaccen rubuce-rubuce, ko ƙarin abokan ciniki. Zaka iya zaɓar biyu.",
    askIslamic: "Shin kana son tsarin kasuwancin Musulunci? Ka ce ee ko a'a.",
    review: "Gaa bayanin kasuwancinka. Ka duba shi da kyau. Idan ya yi daidai, danna Ƙirƙiri kasuwancina.",
    saved: "An ƙirƙiri bayanin kasuwancinka. Barka da zuwa TIJAR!",
    tapFallback: "Ban ji da kyau ba. Zaka iya taɓa amsar a ƙasa.",
  },
  Swahili: {
    welcome: "Karibu TIJAR. Nitakusaidia kuunda wasifu wa biashara yako kwa sauti. Unaweza pia kugusa majibu kwenye skrini.",
    askName: "Biashara yako inaitwaje?",
    askCategory: "Ni biashara ya aina gani? Sema jina la kategoria, au gusa hapo chini.",
    askLocation: "Biashara yako iko wapi? Sema mji wako au eneo lako.",
    askModel: "Unafanya nini hasa? Sema kuuza bidhaa, huduma, chakula, au jumla, au gusa hapo chini.",
    askPayments: "Wateja wanakulipaje? Sema pesa taslimu, uhamisho, POS, mkopo, au mobile money. Unaweza kusema zaidi ya moja, kisha sema nimemaliza.",
    askCredit: "Je, wateja wakati mwingine hununua kwa mkopo na kulipa baadaye? Sema ndiyo au hapana.",
    askStock: "Je, unaweka stoki au bidhaa za kuuza? Sema ndiyo au hapana.",
    askStaff: "Je, una wafanyakazi? Sema ndiyo au hapana.",
    askDiscovery: "Wateja wanakupataje? Sema huja moja kwa moja, WhatsApp, mitandao ya kijamii, rufaa, soko, au gusa hapo chini.",
    askGoals: "Lengo lako kuu ni lipi? Sema kuongeza mauzo, faida zaidi, kudhibiti gharama, kudhibiti madeni, rekodi bora, au wateja zaidi. Unaweza kuchagua mawili.",
    askIslamic: "Je, unataka mfumo wa biashara wa Kiislamu? Sema ndiyo au hapana.",
    review: "Huu ni wasifu wa biashara yako. Ukague kwa makini. Ikiwa ni sahihi, bonyeza Unda biashara yangu.",
    saved: "Wasifu wa biashara yako umeundwa. Karibu TIJAR!",
    tapFallback: "Sikusikia vizuri. Unaweza kugusa jibu hapo chini.",
  },
  Yoruba: {
    welcome: "Kaabo si TIJAR. Emi yoo ran ọ lọwọ lati ṣẹda profaili iṣowo rẹ pẹlu ohun. O tun le tẹ awọn idahun loju iboju.",
    askName: "Kini orukọ iṣowo rẹ?",
    askCategory: "Iru iṣowo wo ni? Sọ orukọ ẹka naa, tabi tẹ ni isalẹ.",
    askLocation: "Nibo ni iṣowo rẹ wa? Sọ ilu tabi agbegbe rẹ.",
    askModel: "Kini o ṣe julọ? Sọ ta ọja, iṣẹ, ounjẹ, tabi osunwon, tabi tẹ ni isalẹ.",
    askPayments: "Bawo ni awọn alabara ṣe sanwo fun ọ? Sọ owo, gbigbe, POS, gbese, tabi mobile money. O le sọ ju ọkan lọ, lẹhinna sọ mo ti pari.",
    askCredit: "Njẹ awọn alabara ma n ra gbese ti wọn si sanwo nigbamii? Sọ bẹẹni tabi bẹẹkọ.",
    askStock: "Njẹ o tọju ọja fun tita? Sọ bẹẹni tabi bẹẹkọ.",
    askStaff: "Njẹ o ni oṣiṣẹ? Sọ bẹẹni tabi bẹẹkọ.",
    askDiscovery: "Bawo ni awọn alabara ṣe ri ọ? Sọ wiwa taara, WhatsApp, social media, itọkasi, ọja, tabi tẹ ni isalẹ.",
    askGoals: "Kini ibi-afẹde akọkọ rẹ? Sọ alekun tita, ere diẹ sii, iṣakoso inawo, iṣakoso gbese, igbasilẹ to dara, tabi alabara diẹ sii. O le yan meji.",
    askIslamic: "Njẹ o fẹ ipo iṣowo Islam? Sọ bẹẹni tabi bẹẹkọ.",
    review: "Eyi ni profaili iṣowo rẹ. Ṣayẹwo rẹ daradara. Ti o ba tọ, tẹ Ṣẹda iṣowo mi.",
    saved: "A ti ṣẹda profaili iṣowo rẹ. Kaabo si TIJAR!",
    tapFallback: "Nko gbọ daradara. O le tẹ idahun ni isalẹ.",
  },
};

const YES_WORDS = [
  "yes", "yeah", "yep", "true", "correct",
  "ee", "eh", "i", "na'am", // Hausa
  "ndiyo", "ndio", "naam", // Swahili
  "bẹẹni", "beeni", "ẹẹni", // Yoruba
];
const NO_WORDS = [
  "no", "nope", "false", "not",
  "a'a", "aa", "ba", "babu", // Hausa
  "hapana", "la", "sio", // Swahili
  "bẹẹkọ", "beekọ", "rárá", "rara", "oti", // Yoruba
];

export function normalizeSpeech(text: string): string {
  return text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9'\s-]/g, " ").replace(/\s+/g, " ").trim();
}

export function parseYesNo(text: string): boolean | null {
  const norm = normalizeSpeech(text);
  const tokens = norm.split(" ");
  if (tokens.some((t) => YES_WORDS.map(normalizeSpeech).includes(t))) return true;
  if (tokens.some((t) => NO_WORDS.map(normalizeSpeech).includes(t))) return false;
  if (norm.includes("ndiyo")) return true;
  if (norm.includes("hapana")) return false;
  return null;
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  daya: 1, biyu: 2, uku: 3, hudu: 4, biyar: 5, // Hausa 1-5
  moja: 1, mbili: 2, tatu: 3, nne: 4, tano: 5, // Swahili 1-5
};

/** Match a spoken category/option: by number ("two", "biyu") or by name keywords. */
export function matchSpokenOption<T extends { id: string; keywords: string[] }>(
  text: string,
  options: T[],
): T | null {
  const norm = normalizeSpeech(text);
  const numToken = norm.split(" ").find((t) => NUMBER_WORDS[t] !== undefined || /^\d+$/.test(t));
  if (numToken) {
    const n = NUMBER_WORDS[numToken] ?? Number.parseInt(numToken, 10);
    if (Number.isFinite(n) && n >= 1 && n <= options.length) return options[n - 1]!;
  }
  let best: { option: T; score: number } | null = null;
  for (const option of options) {
    const score = option.keywords.filter((k) => norm.includes(normalizeSpeech(k))).length;
    if (score > 0 && (!best || score > best.score)) best = { option, score };
  }
  return best?.option ?? null;
}

/** Multi-select matching for payments/discovery/goals. "done/finish" ends selection. */
export function matchSpokenOptions<T extends { id: string; keywords: string[] }>(
  text: string,
  options: T[],
): { matched: T[]; done: boolean } {
  const norm = normalizeSpeech(text);
  const done = /\b(done|finish|finished|mun gama|nimemaliza|mo ti pari|enough)\b/.test(norm);
  const matched = options.filter((o) => o.keywords.some((k) => norm.includes(normalizeSpeech(k))));
  return { matched, done };
}

export const MODEL_KEYWORDS = [
  { id: "retail", keywords: ["retail", "sell products", "products", "shop", "sayar da kaya", "kuuza bidhaa", "ta ọja", "kaya"] },
  { id: "service", keywords: ["service", "services", "aiyuka", "huduma", "iṣẹ", "ise"] },
  { id: "food", keywords: ["food", "abinci", "chakula", "ounje", "ounjẹ"] },
  { id: "wholesale", keywords: ["wholesale", "jumloli", "jumla", "osunwon"] },
  { id: "other", keywords: ["other", "sai dai", "nyingine", "omiran"] },
];

export const PAYMENT_KEYWORDS = [
  { id: "cash", keywords: ["cash", "kuɗi", "kudi", "pesa taslimu", "taslimu", "owo"] },
  { id: "transfer", keywords: ["transfer", "uhamisho", "gbigbe", "bank"] },
  { id: "pos", keywords: ["pos", "kadi", "card"] },
  { id: "credit", keywords: ["credit", "bashi", "mkopo", "gbese"] },
  { id: "mobile_money", keywords: ["mobile money", "mobile", "mpesa", "m-pesa", "simu"] },
];

export const DISCOVERY_KEYWORDS = [
  { id: "walk_in", keywords: ["walk", "come direct", "zuwa kai tsaye", "moja kwa moja", "wiwa taara", "direct"] },
  { id: "whatsapp", keywords: ["whatsapp"] },
  { id: "social", keywords: ["social", "facebook", "instagram", "mitandao", "ijtimai"] },
  { id: "referral", keywords: ["referral", "referrals", "shawarwari", "rufaa", "itọkasi", "friend"] },
  { id: "market", keywords: ["market", "kasuwa", "soko", "ọja", "oja"] },
  { id: "other", keywords: ["other", "nyingine", "omiran", "sai dai"] },
];

export const GOAL_KEYWORDS = [
  { id: "increase_sales", keywords: ["increase sales", "more sales", "ƙara tallace", "kara tallace", "kuongeza mauzo", "alekun tita", "sales"] },
  { id: "increase_profit", keywords: ["profit", "riba", "faida", "ere"] },
  { id: "manage_expenses", keywords: ["expenses", "expense", "gharama", "kashewa", "inawo", "gharama za"] },
  { id: "manage_debt", keywords: ["debt", "bashi", "madeni", "gbese", "deni"] },
  { id: "improve_records", keywords: ["records", "record", "rubuce", "rekodi", "igbasilẹ", "igbasile"] },
  { id: "more_customers", keywords: ["customers", "customer", "abokan ciniki", "wateja", "alabara"] },
];

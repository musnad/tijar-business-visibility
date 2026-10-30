import type { Locale } from "@/lib/i18n/types";
import { formatNgn } from "@/utils/money";

export type StudioGoal = "sales" | "awareness" | "engage" | "launch";
export type StudioStyle = "modern" | "minimal" | "luxury" | "friendly";

export type StudioDraft = {
  caption: string;
  hashtags: string[];
  cta: string;
  script: string;
  source: "catalogue";
};

const GOAL_HOOK: Record<Locale, Record<StudioGoal, string>> = {
  en: {
    sales: "Ready when you are.",
    awareness: "Meet the product shops keep asking about.",
    engage: "Tell us how you would use this.",
    launch: "Just landed in the catalogue.",
  },
  ha: {
    sales: "Shirye take idan ka shirya.",
    awareness: "Ga samfurin da kasuwanni ke tambaya.",
    engage: "Gaya mana yadda za ka yi amfani da shi.",
    launch: "Yanzu ya iso cikin kundin.",
  },
  ar: {
    sales: "جاهز عندما تكون جاهزًا.",
    awareness: "تعرّف على المنتج الذي يسأل عنه التجار.",
    engage: "أخبرنا كيف ستستخدمه.",
    launch: "وصل للتو إلى الكتالوج.",
  },
  yo: {
    sales: "Ó ṣetán nígbà tí o bá ṣetán.",
    awareness: "Pàdé ọjà tí àwọn ilé-ìtajà ń béèrè.",
    engage: "Sọ bí o ṣe máa lòó.",
    launch: "Ó ṣẹ̀ṣẹ̀ dé nínú àkójọ.",
  },
  ig: {
    sales: "Ọ dị njikere mgbe ị dị njikere.",
    awareness: "Zute ngwaahịa a ndị ahịa na-ajụ.",
    engage: "Gwa anyị ka ị ga-esi jiri ya.",
    launch: "Ọ ka bịarutere n'akwụkwọ ngwaahịa.",
  },
  sw: {
    sales: "Tayari unapokuwa tayari.",
    awareness: "Kutana na bidhaa ambayo maduka huuliza.",
    engage: "Tuambie utaitumiaje.",
    launch: "Imewasili tu kwenye katalogi.",
  },
  ff: {
    sales: "Hewaa so a hewii.",
    awareness: "Ndaar ngalu ngu luumoo naaŋata.",
    engage: "Haalan min no mbaaw-ɗaa huutoraade.",
    launch: "Nawti e deftere ngalu.",
  },
};

const STYLE_TONE: Record<Locale, Record<StudioStyle, string>> = {
  en: {
    modern: "Clean lines. High impact.",
    minimal: "Simple, elegant, and clear.",
    luxury: "Crafted for a premium finish.",
    friendly: "Warm, useful, and easy to love.",
  },
  ha: {
    modern: "Tsafta da ƙarfi.",
    minimal: "Sauƙi, kyau, a bayyane.",
    luxury: "An yi shi da kyau na musamman.",
    friendly: "Dumi, amfani, da so.",
  },
  ar: {
    modern: "خطوط نظيفة وتأثير قوي.",
    minimal: "بسيط وأنيق وواضح.",
    luxury: "بجودة فاخرة.",
    friendly: "دافئ وسهل الإعجاب.",
  },
  yo: {
    modern: "Kíkún, tó lágbára.",
    minimal: "Rọrùn, lẹ́wà, kedere.",
    luxury: "A ṣe é pẹ̀lú ọlá.",
    friendly: "Itunu, wúlò, rọrùn láti fẹ́ràn.",
  },
  ig: {
    modern: "Ọcha na ike.",
    minimal: "Dị mfe, mara mma, doro anya.",
    luxury: "Emere ya n'elu ọkwa.",
    friendly: "Na-ekpo ọkụ, bara uru.",
  },
  sw: {
    modern: "Safifu na yenye nguvu.",
    minimal: "Rahisi, maridadi, wazi.",
    luxury: "Imetengenezwa kwa kiwango cha juu.",
    friendly: "Ya joto, yenye faida, rahisi kupendwa.",
  },
  ff: {
    modern: "Laaɓal e doole.",
    minimal: "Newi, jooɗɗi, laaɓi.",
    luxury: "Waɗaa e teddungal.",
    friendly: "Ngiɗal, nafa, newii yiɗeede.",
  },
};

export const STUDIO_LANGUAGE_NAME: Record<Locale, string> = {
  en: "English",
  ha: "Hausa",
  ar: "Arabic",
  yo: "Yoruba",
  ig: "Igbo",
  sw: "Swahili",
  ff: "Fulfulde",
};

export const STUDIO_PROMPT_PLACEHOLDER: Record<Locale, string> = {
  en: "Weekend promo: 20% off wellness packs. Fresh energy, cute packaging, Lagos delivery.",
  ha: "Rangadin karshen mako: rage kashi 20 cikin 100. Kayayyaki masu kyau, isarwa a Lagos.",
  ar: "عرض نهاية الأسبوع: خصم ٢٠٪. تغليف جميل وتوصيل في لاغوس.",
  yo: "Ìpolówó òpin ọ̀sẹ̀: dín 20% kù. Ìpamọ́ dáradára, ìfijí sí Lagos.",
  ig: "Mgbasa ozi izu ụka: 20% ọnụahịa. Ngwugwu mara mma, nnyefe na Lagos.",
  sw: "Ofa ya wikendi: punguzo la 20%. Pakiti maridadi, usafirishaji Lagos.",
  ff: "Yeeyirde yontere: ustude 20%. Pakke jooɗɗe, neldaade Lagos.",
};

const CTA: Record<Locale, string> = {
  en: "Buy now on TIJAR",
  ha: "Sayi yanzu a TIJAR",
  ar: "اشترِ الآن على TIJAR",
  yo: "Ra nísinsin yìí lórí TIJAR",
  ig: "Zụọ ugbu a na TIJAR",
  sw: "Nunua sasa kwenye TIJAR",
  ff: "Soodu jooni e TIJAR",
};

const SCRIPT_LEAD: Record<Locale, string> = {
  en: "3–30s clip",
  ha: "Shirin daƙiƙa 3–30",
  ar: "مقطع 3–30 ثانية",
  yo: "Fídíò ìṣẹ́jú àáyá 3–30",
  ig: "Vidiyo nkeji 3–30",
  sw: "Klipu ya sekunde 3–30",
  ff: "Widewo 3–30 hojomaaji",
};

export function studioCta(locale: Locale): string {
  return CTA[locale];
}

export function draftStudioContent(input: {
  productName: string;
  businessName: string;
  description?: string | null;
  notes?: string | null;
  salePrice?: number | null;
  unit?: string | null;
  goal: StudioGoal;
  style: StudioStyle;
  locale: Locale;
}): StudioDraft {
  const locale = input.locale;
  const desc = (input.description || input.notes || "").trim().replace(/\s+/g, " ").slice(0, 160);
  const price = input.salePrice != null ? formatNgn(input.salePrice) : null;
  const unit = input.unit?.trim();
  const hook = GOAL_HOOK[locale][input.goal];
  const tone = STYLE_TONE[locale][input.style];
  const cta = CTA[locale];
  const priceBit = price ? (unit ? `${price} / ${unit}` : price) : null;
  const caption = [
    `${input.productName} · ${input.businessName}`,
    hook,
    tone,
    desc || null,
    priceBit,
    cta,
  ]
    .filter(Boolean)
    .join(" ");

  const tags = [
    "tijar",
    input.goal,
    input.style,
    input.productName.split(/\s+/).slice(0, 2).join("").toLowerCase(),
  ].filter(Boolean);

  const script = [
    `${SCRIPT_LEAD[locale]}: ${input.productName}.`,
    hook,
    desc ? desc.slice(0, 90) : tone,
    priceBit ? priceBit : "",
    cta,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    caption,
    hashtags: tags.map((t) => t.replace(/[^\p{L}\p{N}]+/gu, "")).filter(Boolean),
    cta,
    script,
    source: "catalogue",
  };
}

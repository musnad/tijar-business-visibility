import type { Locale } from "../types";
import type { MessageTree } from "../types";

type CustomerCopy = {
  title: string;
  actionNewCredit: string;
  actionAddCustomer: string;
  actionCollect: string;
  add: string;
  saved: string;
  creditSaved: string;
  paymentSaved: string;
  saveCredit: string;
  savePayment: string;
  namePlaceholder: string;
  addAndCredit: string;
  activityTitle: string;
  activityCredit: string;
  activityPayment: string;
  activityEmpty: string;
  nameRequired: string;
};

const ha: CustomerCopy = {
  title: "Abokan ciniki",
  actionNewCredit: "Sabon bashi",
  actionAddCustomer: "Ƙara suna",
  actionCollect: "Karɓi biya",
  add: "Ajiye abokin ciniki",
  saved: "An ajiye sunan abokin ciniki.",
  creditSaved: "An rubuta bashi. An sabunta adadin da yake bi.",
  paymentSaved: "An rubuta biyan kuɗi. An sabunta ma'auni.",
  saveCredit: "Ajiye bashi",
  savePayment: "Ajiye biyan kuɗi",
  namePlaceholder: "Sunan abokin ciniki",
  addAndCredit: "Ajiye kuma ba bashi",
  activityTitle: "Abubuwan da aka rubuta",
  activityCredit: "An ba bashi",
  activityPayment: "Ya biya",
  activityEmpty: "Har yanzu babu rubutu. Fara da sabon bashi ko karɓi biya.",
  nameRequired: "Rubuta sunan abokin ciniki (aƙalla haruffa 2).",
};

const yo: CustomerCopy = {
  title: "Oníbàárà",
  actionNewCredit: "Gbèsè tuntun",
  actionAddCustomer: "Fi orúkọ kun",
  actionCollect: "Gba owó",
  add: "Fi oníbàárà kun",
  saved: "Orúkọ oníbàárà ti di pamọ́.",
  creditSaved: "A ṣe àkọsílẹ̀ gbèsè. A ṣe àtúnṣe owó tí ó jẹ.",
  paymentSaved: "A ṣe àkọsílẹ̀ ìsanwó. A ṣe àtúnṣe ìdíyelé.",
  saveCredit: "Fi gbèsè pamọ́",
  savePayment: "Fi ìsanwó pamọ́",
  namePlaceholder: "Orúkọ oníbàárà",
  addAndCredit: "Fi pamọ́ kí o sì fi gbèsè",
  activityTitle: "Àkọsílẹ̀ lẹ́yìn",
  activityCredit: "Gbèsè fún",
  activityPayment: "Ó san",
  activityEmpty: "Kò sí àkọsílẹ̀ sibẹ. Bẹ̀rẹ̀ pẹ̀lú gbèsè tuntun tàbí gba owó.",
  nameRequired: "Tẹ orúkọ oníbàárà (ó kéré jù lẹ́tà 2).",
};

const ig: CustomerCopy = {
  title: "Ndị ahịa",
  actionNewCredit: "Ụgwọ ọhụrụ",
  actionAddCustomer: "Tinye aha",
  actionCollect: "Nata ụgwọ",
  add: "Tinye onye ahịa",
  saved: "Echekwala aha onye ahịa.",
  creditSaved: "Edere ụgwọ. Emelitere ịgụ.",
  paymentSaved: "Edere ịkwụ ụgwọ. Emelitere balance.",
  saveCredit: "Chekwaa ụgwọ",
  savePayment: "Chekwaa ịkwụ ụgwọ",
  namePlaceholder: "Aha onye ahịa",
  addAndCredit: "Chekwaa ma nye ụgwọ",
  activityTitle: "Ihe edere ugbu a",
  activityCredit: "Enyere ụgwọ",
  activityPayment: "Akụrụ ụgwọ",
  activityEmpty: "Enweghị ndekọ. Malite site na ụgwọ ọhụrụ ma ọ bụ nata ụgwọ.",
  nameRequired: "Dee aha onye ahịa (ọ bụla oge 2).",
};

const ar: CustomerCopy = {
  title: "الزبائن",
  actionNewCredit: "دين جديد",
  actionAddCustomer: "إضافة اسم",
  actionCollect: "تحصيل",
  add: "إضافة زبون",
  saved: "تم حفظ اسم الزبون.",
  creditSaved: "تم تسجيل الدين وتحديث الرصيد.",
  paymentSaved: "تم تسجيل الدفعة وتحديث الرصيد.",
  saveCredit: "حفظ الدين",
  savePayment: "حفظ الدفعة",
  namePlaceholder: "اسم الزبون",
  addAndCredit: "حفظ وبيع بالآجل",
  activityTitle: "آخر التسجيلات",
  activityCredit: "آجل لـ",
  activityPayment: "دفع",
  activityEmpty: "لا توجد تسجيلات بعد. ابدأ بدين جديد أو تحصيل.",
  nameRequired: "أدخل اسم الزبون (حرفان على الأقل).",
};

const sw: CustomerCopy = {
  title: "Wateja",
  actionNewCredit: "Mkopo mpya",
  actionAddCustomer: "Ongeza jina",
  actionCollect: "Kusanya malipo",
  add: "Ongeza mteja",
  saved: "Jina la mteja limehifadhiwa.",
  creditSaved: "Mkopo umeandikwa. Salio limesasishwa.",
  paymentSaved: "Malipo yameandikwa. Salio limesasishwa.",
  saveCredit: "Hifadhi mkopo",
  savePayment: "Hifadhi malipo",
  namePlaceholder: "Jina la mteja",
  addAndCredit: "Hifadhi na toa mkopo",
  activityTitle: "Imeandikwa hivi karibuni",
  activityCredit: "Mkopo kwa",
  activityPayment: "Amelipa",
  activityEmpty: "Hakuna rekodi bado. Anza na mkopo mpya au ukusanyaji.",
  nameRequired: "Andika jina la mteja (herufi 2 au zaidi).",
};

const ff: CustomerCopy = {
  title: "Jeyɓe",
  actionNewCredit: "Ngal hesere",
  actionAddCustomer: "Ɓeydu innde",
  actionCollect: "Jaɓ fayde",
  add: "Ɓey jeyɓo",
  saved: "Innde jeyɓo danndii.",
  creditSaved: "Ngal winndii. Hesere ngal taƴii.",
  paymentSaved: "Fayde winndii. Hesere ngal taƴii.",
  saveCredit: "Danndu ngal",
  savePayment: "Danndu fayde",
  namePlaceholder: "Innde jeyɓo",
  addAndCredit: "Danndu tee hokk ngal",
  activityTitle: "Ko winndii coggu",
  activityCredit: "Ngal hokkii",
  activityPayment: "Payii",
  activityEmpty: "Alaa winndere tii. Fuɗɗo e ngal hesere maa jaɓ fayde.",
  nameRequired: "Winndu innde jeyɓo (aƙalla 2 arfi).",
};

const byLocale: Record<Exclude<Locale, "en">, CustomerCopy> = {
  ha,
  yo,
  ig,
  ar,
  sw,
  ff,
};

export function getCustomersTranslationOverlay(locale: Locale): MessageTree {
  if (locale === "en") return {};
  const m = byLocale[locale];
  if (!m) return {};
  return {
    app: {
      customers: { ...m },
    },
  };
}

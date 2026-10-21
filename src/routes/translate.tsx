import { createFileRoute } from "@tanstack/react-router";

import { TranslatorScreen } from "@/features/translate/translator-screen";

export const Route = createFileRoute("/translate")({
  head: () => ({
    meta: [
      { title: "Translator — TIJAR" },
      { name: "description", content: "Free conversation translator for customers and sellers: Hausa, English, Swahili, Yoruba and Nigerian Pidgin." },
    ],
  }),
  component: TranslatorScreen,
});

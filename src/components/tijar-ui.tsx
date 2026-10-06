"use client";

import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Check,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Share2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppDownloadButtons, AppDeviceShowcase } from "@/components/app-download";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/context";

export function SectionIntro({
  eyebrow,
  title,
  copy,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  copy?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-2xl"}>
      {eyebrow && (
        <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl font-extrabold leading-[1.08] sm:text-4xl lg:text-5xl">{title}</h2>
      {copy && (
        <p className="mt-5 text-base leading-8 text-muted-foreground sm:text-lg">{copy}</p>
      )}
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  copy,
  children,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="border-b border-border">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:py-28 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-6">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
            {eyebrow}
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.04] sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">{copy}</p>
          <div className="mt-8">
            <AppDownloadButtons size="lg" />
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

export function DownloadButton() {
  return <AppDownloadButtons />;
}

export function FeatureCard({
  number,
  icon: Icon,
  title,
  copy,
}: {
  number?: string;
  icon?: LucideIcon;
  title: string;
  copy: string;
}) {
  return (
    <article className="rounded-[1.25rem] border border-border bg-card p-7">
      <div className="mb-12 flex items-center justify-between">
        {number && (
          <span className="text-xs font-extrabold tracking-[0.14em] text-muted-foreground">
            {number}
          </span>
        )}
        {Icon && <Icon className="size-6 stroke-[1.7] text-primary" />}
      </div>
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="mt-3 leading-7 text-muted-foreground">{copy}</p>
    </article>
  );
}

export type PhoneScreen = "home" | "record" | "learn" | "business";

function ScreenHeader({ label }: { label: string }) {
  const { t } = useTranslation();

  return (
    <div className="mb-5 flex items-center justify-between">
      <span className="text-xs font-extrabold tracking-[0.08em] text-primary">
        {t("tijarUi.brand")}
      </span>
      <span className="grid size-8 place-items-center rounded-full bg-secondary/45 text-xs font-bold">
        AF
      </span>
      <span className="sr-only">{label}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-border bg-card p-3">
      <p className="text-[11px] leading-4 text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-extrabold">{value}</p>
    </div>
  );
}

function HomeScreen() {
  const { t } = useTranslation();

  return (
    <div className="min-h-[520px] rounded-[1.4rem] p-4">
      <ScreenHeader label={t("tijarUi.phoneScreens.home")} />
      <p className="text-sm text-muted-foreground">{t("tijarUi.homeScreen.greeting")}</p>
      <h3 className="mt-1 text-xl font-extrabold">{t("tijarUi.homeScreen.title")}</h3>
      <div className="mt-5 rounded-[1.25rem] bg-primary p-5 text-primary-foreground">
        <p className="text-xs opacity-75">{t("tijarUi.homeScreen.todaysSales")}</p>
        <p className="mt-2 text-3xl font-extrabold">{t("tijarUi.homeScreen.salesAmount")}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Stat label={t("tijarUi.homeScreen.expenses")} value={t("tijarUi.homeScreen.expensesAmount")} />
        <Stat
          label={t("tijarUi.homeScreen.customersOwing")}
          value={t("tijarUi.homeScreen.owingAmount")}
        />
      </div>
      <div className="mt-4 rounded-[1.25rem] border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-primary">
          <BookOpen className="size-4" />
          <span className="text-xs font-bold">{t("tijarUi.homeScreen.todaysLesson")}</span>
        </div>
        <p className="mt-3 font-bold">{t("tijarUi.homeScreen.lessonTitle")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("tijarUi.homeScreen.lessonDuration")}</p>
      </div>
    </div>
  );
}

function RecordScreen() {
  const { t } = useTranslation();
  const items = [
    t("tijarUi.recordScreen.sale"),
    t("tijarUi.recordScreen.expense"),
    t("tijarUi.recordScreen.customerDebt"),
  ];

  return (
    <div className="min-h-[520px] rounded-[1.4rem] p-4">
      <ScreenHeader label={t("tijarUi.phoneScreens.record")} />
      <p className="text-sm font-bold text-primary">{t("tijarUi.recordScreen.title")}</p>
      <h3 className="mt-3 text-2xl font-extrabold">{t("tijarUi.recordScreen.heading")}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{t("tijarUi.recordScreen.subtitle")}</p>
      <div className="mt-7 grid gap-3">
        {items.map((item) => (
          <div
            key={item}
            className="flex h-14 items-center justify-between rounded-[1.25rem] border border-border bg-card px-4 font-bold"
          >
            <span>{item}</span>
            <ArrowRight className="size-4 text-primary" />
          </div>
        ))}
        <div className="flex h-14 items-center justify-center gap-2 rounded-[1.25rem] bg-primary px-4 font-bold text-primary-foreground">
          {t("tijarUi.recordScreen.tellTijar")}
        </div>
      </div>
    </div>
  );
}

function LearnScreen() {
  const { t } = useTranslation();

  return (
    <div className="min-h-[520px] rounded-[1.4rem] p-4">
      <ScreenHeader label={t("tijarUi.phoneScreens.learn")} />
      <p className="text-sm font-bold text-primary">{t("tijarUi.learnScreen.title")}</p>
      <div className="mt-4 rounded-[1.25rem] border border-border bg-card p-5">
        <p className="text-xs font-bold text-muted-foreground">{t("tijarUi.learnScreen.todaysLesson")}</p>
        <h3 className="mt-3 text-2xl font-extrabold">{t("tijarUi.learnScreen.lessonTitle")}</h3>
        <p className="mt-2 text-sm">{t("tijarUi.learnScreen.lessonDuration")}</p>
      </div>
      <div className="mt-4 rounded-[1.25rem] border border-border bg-card p-4">
        <p className="text-sm font-semibold">{t("tijarUi.learnScreen.businessLevel")}</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full">
          <div className="h-full w-2/3 rounded-full bg-primary" />
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>{t("tijarUi.learnScreen.xp")}</span>
          <span>{t("tijarUi.learnScreen.streak")}</span>
        </div>
      </div>
      <Button className="mt-5 w-full">{t("tijarUi.learnScreen.startLesson")}</Button>
    </div>
  );
}

function BusinessScreen() {
  const { t } = useTranslation();

  return (
    <div className="min-h-[520px] rounded-[1.4rem] p-4">
      <ScreenHeader label={t("tijarUi.phoneScreens.business")} />
      <p className="text-sm font-bold text-primary">{t("tijarUi.businessScreen.title")}</p>
      <div className="mt-4 rounded-[1.25rem] border border-border bg-card p-5 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-accent text-xl font-extrabold text-primary">
          AF
        </div>
        <h3 className="mt-4 text-2xl font-extrabold">{t("tijarUi.businessScreen.businessName")}</h3>
        <div className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary">
          <BadgeCheck className="size-4" /> {t("tijarUi.businessScreen.verified")}
        </div>
        <p className="mt-4 text-sm">{t("tijarUi.businessScreen.category")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("tijarUi.businessScreen.location")}</p>
        <Button className="mt-6 w-full">
          <Share2 /> {t("tijarUi.businessScreen.shareProfile")}
        </Button>
      </div>
    </div>
  );
}

export function PhoneMockup({ screen = "home" }: { screen?: PhoneScreen }) {
  return (
    <div className="mx-auto w-full max-w-[340px] rounded-[2.4rem] border-[6px] border-foreground bg-card p-3">
      <div className="mx-auto mb-5 h-1.5 w-16 rounded-full bg-foreground/15" />
      {screen === "home" && <HomeScreen />}
      {screen === "record" && <RecordScreen />}
      {screen === "learn" && <LearnScreen />}
      {screen === "business" && <BusinessScreen />}
    </div>
  );
}

export function LessonCard() {
  const { t } = useTranslation();
  const answers = [
    t("tijarUi.lessonCard.answerA"),
    t("tijarUi.lessonCard.answerB"),
    t("tijarUi.lessonCard.answerC"),
  ];

  return (
    <div className="rounded-[1.25rem] border border-border bg-card p-6 sm:p-8">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
            {t("tijarUi.lessonCard.eyebrow")}
          </p>
          <h3 className="mt-2 text-2xl font-extrabold">{t("tijarUi.lessonCard.title")}</h3>
        </div>
        <span className="rounded-full border border-border px-3 py-2 text-sm font-bold">
          {t("tijarUi.lessonCard.duration")}
        </span>
      </div>
      <p className="mt-7 text-lg leading-8">{t("tijarUi.lessonCard.question")}</p>
      <div className="mt-5 grid gap-3">
        {answers.map((answer, index) => (
          <div
            key={answer}
            className={`rounded-xl border p-4 font-semibold ${index === 1 ? "border-primary bg-accent text-accent-foreground" : "border-border"}`}
          >
            {answer}
            {index === 1 && <Check className="ms-2 inline size-5" />}
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between">
        <span className="font-bold text-primary">{t("tijarUi.lessonCard.correctLabel")}</span>
        <span className="font-extrabold text-secondary-foreground">{t("tijarUi.lessonCard.xp")}</span>
      </div>
      <div className="mt-6 border-t border-border pt-5">
        <div className="flex justify-between text-sm font-semibold">
          <span>{t("tijarUi.lessonCard.level")}</span>
          <span>{t("tijarUi.lessonCard.levelXp")}</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full">
          <div className="h-full w-2/3 rounded-full bg-primary" />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{t("tijarUi.lessonCard.streak")}</p>
      </div>
      <p className="mt-5 text-xs text-muted-foreground">{t("tijarUi.lessonCard.footnote")}</p>
    </div>
  );
}

export function BusinessProfileCard() {
  const { t } = useTranslation();

  return (
    <div className="rounded-[1.25rem] border border-border bg-card p-6 sm:p-8">
      <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-extrabold text-primary">
        <BadgeCheck className="size-4" /> {t("tijarUi.businessProfile.verified")}
      </div>
      <div className="mt-6 flex items-center gap-4">
        <div className="grid size-16 shrink-0 place-items-center rounded-full bg-accent text-xl font-extrabold text-primary">
          AF
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-2xl font-extrabold">{t("tijarUi.businessProfile.name")}</h3>
          <p className="text-sm text-muted-foreground">{t("tijarUi.businessProfile.category")}</p>
        </div>
      </div>
      <p className="mt-5 flex items-center gap-2 text-sm">
        <MapPin className="size-4 text-primary" /> {t("tijarUi.businessProfile.location")}{" "}
        <span className="ms-auto font-bold">⭐ {t("common.rating")}</span>
      </p>
      <p className="mt-5 border-y border-border py-4 text-sm font-semibold">
        {t("tijarUi.businessProfile.products")}
      </p>
      <div className="mt-5 grid grid-cols-3 gap-2">
        <ProfileAction icon={Phone} label={t("tijarUi.businessProfile.call")} />
        <ProfileAction icon={MessageCircle} label={t("tijarUi.businessProfile.whatsapp")} />
        <ProfileAction icon={Navigation} label={t("tijarUi.businessProfile.directions")} />
      </div>
      <Button className="mt-3 w-full">
        <Share2 /> {t("tijarUi.businessProfile.share")}
      </Button>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        {t("tijarUi.businessProfile.footnote")}
      </p>
    </div>
  );
}

function ProfileAction({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-md text-center text-[11px] font-bold">
      <Icon className="size-4 text-primary" />
      {label}
    </div>
  );
}

export function FinalCta() {
  const { t } = useTranslation();

  return (
    <section id="download-app" className="scroll-mt-24 px-5 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[1.5rem] bg-foreground px-6 py-12 text-background sm:px-10 sm:py-16">
        <div className="mx-auto max-w-3xl text-center lg:mx-0 lg:max-w-none lg:text-start">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-secondary">
            {t("download.finalWorking")}
          </p>
          <h2 className="mt-4 text-4xl font-extrabold sm:text-5xl">{t("download.finalTitle")}</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-background/80 sm:text-base lg:mx-0">
            {t("download.finalCopy")}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
            <AppDownloadButtons size="lg" theme="dark" />
          </div>
        </div>
        <div className="mt-10 lg:mt-12">
          <AppDeviceShowcase />
        </div>
      </div>
    </section>
  );
}

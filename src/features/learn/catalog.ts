import { BUSINESS_BASICS_LESSONS, BUSINESS_BASICS_LEVEL_ID } from "@/features/learn/business-basics-lessons";
import type { LearnLevelPreview, LearnPath } from "@/features/learn/types";

export const LEARN_PATHS: LearnPath[] = [
  {
    id: BUSINESS_BASICS_LEVEL_ID,
    titleKey: "app.learn.paths.businessBasics.title",
    subtitleKey: "app.learn.paths.businessBasics.subtitle",
    levelLabelKey: "app.learn.paths.businessBasics.level",
    icon: "store",
    colorClass: "bg-emerald-100 text-emerald-800",
    lessons: BUSINESS_BASICS_LESSONS,
  },
];

export const FUTURE_LEVEL_PREVIEWS: LearnLevelPreview[] = [
  { id: "money-master", titleKey: "app.learn.future.l2", emoji: "💰", locked: true },
  { id: "sales-champion", titleKey: "app.learn.future.l3", emoji: "🛍️", locked: true },
  { id: "customer-boss", titleKey: "app.learn.future.l4", emoji: "❤️", locked: true },
  { id: "stock-master", titleKey: "app.learn.future.l5", emoji: "📦", locked: true },
  { id: "credit-manager", titleKey: "app.learn.future.l6", emoji: "🤝", locked: true },
  { id: "marketing-builder", titleKey: "app.learn.future.l7", emoji: "📣", locked: true },
  { id: "digital-business", titleKey: "app.learn.future.l8", emoji: "📱", locked: true },
  { id: "business-intelligence", titleKey: "app.learn.future.l9", emoji: "📊", locked: true },
  { id: "ethical-islamic", titleKey: "app.learn.future.l10", emoji: "☪️", locked: true },
  { id: "growth-leader", titleKey: "app.learn.future.l11", emoji: "🚀", locked: true },
];

export function findLesson(lessonId: string): { path: LearnPath; lesson: LearnPath["lessons"][number] } | null {
  for (const path of LEARN_PATHS) {
    const lesson = path.lessons.find((l) => l.id === lessonId);
    if (lesson) return { path, lesson };
  }
  return null;
}

export function allLessonsInOrder(): { path: LearnPath; lesson: LearnPath["lessons"][number] }[] {
  const out: { path: LearnPath; lesson: LearnPath["lessons"][number] }[] = [];
  for (const path of LEARN_PATHS) {
    for (const lesson of path.lessons) {
      out.push({ path, lesson });
    }
  }
  return out;
}

export function isLessonUnlocked(lessonId: string, completedIds: Set<string>): boolean {
  const ordered = allLessonsInOrder();
  const idx = ordered.findIndex((x) => x.lesson.id === lessonId);
  if (idx <= 0) return true;
  const prev = ordered[idx - 1]!.lesson.id;
  return completedIds.has(prev);
}

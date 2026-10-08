import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { LearnProgressState } from "@/features/learn/types";
import { todayIsoDate, yesterdayIsoDate } from "@/features/learn/learn-math";

const STORAGE_PREFIX = "tijar-learn-progress:";

function defaultState(): LearnProgressState {
  const today = todayIsoDate();
  return {
    totalXp: 0,
    streakCount: 0,
    lastActivityDate: null,
    heartsRemaining: 5,
    heartsDate: today,
    completedLessonIds: [],
    badges: [],
  };
}

function normalizeHearts(state: LearnProgressState): LearnProgressState {
  const today = todayIsoDate();
  if (state.heartsDate !== today) {
    return { ...state, heartsRemaining: 5, heartsDate: today };
  }
  return state;
}

function readLocal(profileId: string): LearnProgressState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + profileId);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as LearnProgressState;
    return normalizeHearts({ ...defaultState(), ...parsed });
  } catch {
    return defaultState();
  }
}

function writeLocal(profileId: string, state: LearnProgressState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_PREFIX + profileId, JSON.stringify(state));
}

export async function fetchLearnProgress(profileId: string): Promise<LearnProgressState> {
  const supabase = getSupabaseBrowserClient();
  const local = readLocal(profileId);

  const { data: stateRow, error: stateError } = await supabase
    .from("user_learn_state")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (stateError?.message.includes("does not exist") || stateError?.code === "PGRST205") {
    return local;
  }

  const { data: completions } = await supabase
    .from("user_lesson_completions")
    .select("lesson_id")
    .eq("profile_id", profileId);

  if (!stateRow && !completions?.length) {
    return local;
  }

  const merged: LearnProgressState = normalizeHearts({
    totalXp: stateRow?.total_xp ?? local.totalXp,
    streakCount: stateRow?.streak_count ?? local.streakCount,
    lastActivityDate: stateRow?.last_activity_date ?? local.lastActivityDate,
    heartsRemaining: stateRow?.hearts_remaining ?? local.heartsRemaining,
    heartsDate: stateRow?.hearts_date ?? local.heartsDate,
    completedLessonIds:
      completions?.map((c) => c.lesson_id as string) ??
      local.completedLessonIds,
    badges: local.badges ?? [],
  });

  writeLocal(profileId, merged);
  return merged;
}

async function persistRemote(profileId: string, state: LearnProgressState) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("user_learn_state").upsert({
    profile_id: profileId,
    total_xp: state.totalXp,
    streak_count: state.streakCount,
    last_activity_date: state.lastActivityDate,
    hearts_remaining: state.heartsRemaining,
    hearts_date: state.heartsDate,
  });
  if (error && !error.message.includes("does not exist") && error.code !== "PGRST205") {
    console.warn("learn state sync", error.message);
  }
}

export async function saveLearnProgress(profileId: string, state: LearnProgressState) {
  const normalized = normalizeHearts(state);
  writeLocal(profileId, normalized);
  await persistRemote(profileId, normalized);
}

export async function completeLesson(
  profileId: string,
  lessonId: string,
  xpEarned: number,
  state: LearnProgressState,
): Promise<LearnProgressState> {
  if (state.completedLessonIds.includes(lessonId)) {
    return state;
  }

  const today = todayIsoDate();
  let streak = state.streakCount;
  if (state.lastActivityDate === today) {
    // same day — streak unchanged
  } else if (state.lastActivityDate === yesterdayIsoDate()) {
    streak += 1;
  } else {
    streak = 1;
  }

  const next: LearnProgressState = normalizeHearts({
    ...state,
    totalXp: state.totalXp + xpEarned,
    streakCount: streak,
    lastActivityDate: today,
    completedLessonIds: [...state.completedLessonIds, lessonId],
  });

  writeLocal(profileId, next);
  await persistRemote(profileId, next);

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("user_lesson_completions").upsert({
    profile_id: profileId,
    lesson_id: lessonId,
    xp_earned: xpEarned,
  });
  if (error && !error.message.includes("does not exist") && error.code !== "PGRST205") {
    console.warn("lesson completion sync", error.message);
  }

  return next;
}

export async function awardLearnBadge(
  profileId: string,
  state: LearnProgressState,
  badgeId: string,
  bonusXp: number,
): Promise<LearnProgressState> {
  if (state.badges.includes(badgeId)) return state;
  const next: LearnProgressState = {
    ...state,
    badges: [...state.badges, badgeId],
    totalXp: state.totalXp + bonusXp,
  };
  await saveLearnProgress(profileId, next);
  return next;
}

export async function loseHeart(
  profileId: string,
  state: LearnProgressState,
): Promise<LearnProgressState> {
  const normalized = normalizeHearts(state);
  const next = {
    ...normalized,
    heartsRemaining: Math.max(0, normalized.heartsRemaining - 1),
  };
  await saveLearnProgress(profileId, next);
  return next;
}

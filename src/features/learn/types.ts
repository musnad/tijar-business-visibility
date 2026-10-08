export type LearnStep =
  | {
      kind: "story";
      paragraphKeys: string[];
      /** e.g. 👗 for clothing shop scenes */
      sceneEmoji?: string;
      characterName?: string;
    }
  | { kind: "visual"; lineKeys: string[] }
  | { kind: "insight"; bodyKey: string }
  | {
      kind: "choose";
      promptKey: string;
      optionKeys: string[];
      correctIndex: number;
      explainKey?: string;
      xp?: number;
    }
  | {
      kind: "compare";
      promptKey: string;
      businesses: { labelKey: string; sales: number; costs: number }[];
      correctIndex: number;
      xp?: number;
    }
  | {
      kind: "mission";
      titleKey: string;
      hintKey: string;
      missionType: "sale" | "expense" | "sale_count";
      target: number;
      bonusXp: number;
      recordPath: "/app/record" | "/app/sales";
      recordType?: "sale" | "expense";
    }
  | {
      kind: "multi_pick";
      promptKey: string;
      optionKeys: string[];
      correctIndices: number[];
    };

export type LearnLesson = {
  id: string;
  titleKey: string;
  xp: number;
  steps: LearnStep[];
};

export type LearnPath = {
  id: string;
  titleKey: string;
  subtitleKey: string;
  levelLabelKey?: string;
  icon: "store" | "coins" | "target" | "sparkles" | "clipboard" | "moon" | "heart" | "megaphone" | "smartphone" | "chart" | "rocket";
  colorClass: string;
  locked?: boolean;
  islamicFocus?: boolean;
  lessons: LearnLesson[];
};

export type LearnProgressState = {
  totalXp: number;
  streakCount: number;
  lastActivityDate: string | null;
  heartsRemaining: number;
  heartsDate: string;
  completedLessonIds: string[];
  badges: string[];
};

export type LearnLevelPreview = {
  id: string;
  titleKey: string;
  emoji: string;
  locked: true;
};

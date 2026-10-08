import type { LearnLesson } from "@/features/learn/types";

const P = "app.learn.bb";

/** Level 1 — Profit, Records & Daily Shop Habits (10 lessons). */
export const BUSINESS_BASICS_LESSONS: LearnLesson[] = [
  {
    id: "bb-01-making-money",
    titleKey: `${P}.l1.title`,
    xp: 50,
    steps: [
      {
        kind: "story",
        paragraphKeys: [`${P}.l1.story1`, `${P}.l1.story2`, `${P}.l1.story3`],
        sceneEmoji: "👗",
        characterName: "Aisha",
      },
      {
        kind: "choose",
        promptKey: `${P}.l1.chooseQ`,
        optionKeys: [`${P}.l1.chooseA`, `${P}.l1.chooseB`],
        correctIndex: 1,
        explainKey: `${P}.l1.chooseExplain`,
        xp: 25,
      },
      {
        kind: "insight",
        bodyKey: `${P}.l1.mathInsight`,
      },
      {
        kind: "choose",
        promptKey: `${P}.l1.calcQ`,
        optionKeys: [`${P}.l1.calcA`, `${P}.l1.calcB`, `${P}.l1.calcC`],
        correctIndex: 0,
        explainKey: `${P}.l1.calcExplain`,
        xp: 25,
      },
    ],
  },
  {
    id: "bb-02-sales-not-profit",
    titleKey: `${P}.l2.title`,
    xp: 50,
    steps: [
      { kind: "visual", lineKeys: [`${P}.l2.v1`, `${P}.l2.v2`, `${P}.l2.v3`, `${P}.l2.v4`, `${P}.l2.v5`] },
      {
        kind: "choose",
        promptKey: `${P}.l2.salesQ`,
        optionKeys: [`${P}.l2.salesA`, `${P}.l2.salesB`, `${P}.l2.salesC`],
        correctIndex: 0,
        explainKey: `${P}.l2.salesExplain`,
      },
      {
        kind: "choose",
        promptKey: `${P}.l2.profitQ`,
        optionKeys: [`${P}.l2.profitA`, `${P}.l2.profitB`, `${P}.l2.profitC`],
        correctIndex: 1,
        explainKey: `${P}.l2.profitExplain`,
      },
      {
        kind: "compare",
        promptKey: `${P}.l2.compareQ`,
        businesses: [
          { labelKey: `${P}.l2.bizA`, sales: 200_000, costs: 150_000 },
          { labelKey: `${P}.l2.bizB`, sales: 100_000, costs: 40_000 },
          { labelKey: `${P}.l2.bizC`, sales: 80_000, costs: 20_000 },
        ],
        correctIndex: 1,
        xp: 50,
      },
    ],
  },
  {
    id: "bb-03-notebook-memory",
    titleKey: `${P}.l3.title`,
    xp: 50,
    steps: [
      {
        kind: "story",
        paragraphKeys: [`${P}.l3.story1`, `${P}.l3.story2`, `${P}.l3.story3`, `${P}.l3.story4`],
      },
      { kind: "insight", bodyKey: `${P}.l3.insight` },
      {
        kind: "choose",
        promptKey: `${P}.l3.chooseQ`,
        optionKeys: [`${P}.l3.chooseA`, `${P}.l3.chooseB`],
        correctIndex: 0,
        explainKey: `${P}.l3.chooseExplain`,
        xp: 50,
      },
      {
        kind: "mission",
        titleKey: `${P}.l3.missionTitle`,
        hintKey: `${P}.l3.missionHint`,
        missionType: "sale_count",
        target: 5,
        bonusXp: 50,
        recordPath: "/app/record",
        recordType: "sale",
      },
    ],
  },
  {
    id: "bb-04-sale-story",
    titleKey: `${P}.l4.title`,
    xp: 100,
    steps: [
      { kind: "insight", bodyKey: `${P}.l4.intro` },
      {
        kind: "choose",
        promptKey: `${P}.l4.amountQ`,
        optionKeys: [`${P}.l4.amountA`, `${P}.l4.amountB`],
        correctIndex: 1,
        explainKey: `${P}.l4.amountExplain`,
      },
      { kind: "insight", bodyKey: `${P}.l4.checklist` },
      {
        kind: "mission",
        titleKey: `${P}.l4.missionTitle`,
        hintKey: `${P}.l4.missionHint`,
        missionType: "sale",
        target: 1,
        bonusXp: 100,
        recordPath: "/app/record",
        recordType: "sale",
      },
    ],
  },
  {
    id: "bb-05-open-shop",
    titleKey: `${P}.l5.title`,
    xp: 50,
    steps: [
      { kind: "insight", bodyKey: `${P}.l5.routine` },
      {
        kind: "choose",
        promptKey: `${P}.l5.openQ`,
        optionKeys: [`${P}.l5.openA`, `${P}.l5.openB`, `${P}.l5.openC`],
        correctIndex: 1,
        explainKey: `${P}.l5.openExplain`,
        xp: 50,
      },
    ],
  },
  {
    id: "bb-06-where-money",
    titleKey: `${P}.l6.title`,
    xp: 50,
    steps: [
      { kind: "story", paragraphKeys: [`${P}.l6.story1`, `${P}.l6.story2`] },
      { kind: "insight", bodyKey: `${P}.l6.leaks` },
      { kind: "insight", bodyKey: `${P}.l6.teach` },
      {
        kind: "mission",
        titleKey: `${P}.l6.missionTitle`,
        hintKey: `${P}.l6.missionHint`,
        missionType: "expense",
        target: 1,
        bonusXp: 50,
        recordPath: "/app/record",
        recordType: "expense",
      },
    ],
  },
  {
    id: "bb-07-personal-vs-business",
    titleKey: `${P}.l7.title`,
    xp: 50,
    steps: [
      { kind: "story", paragraphKeys: [`${P}.l7.story1`, `${P}.l7.story2`] },
      {
        kind: "choose",
        promptKey: `${P}.l7.withdrawQ`,
        optionKeys: [`${P}.l7.withdrawA`, `${P}.l7.withdrawB`, `${P}.l7.withdrawC`],
        correctIndex: 1,
        explainKey: `${P}.l7.withdrawExplain`,
      },
      { kind: "insight", bodyKey: `${P}.l7.teach` },
    ],
  },
  {
    id: "bb-08-close-shop",
    titleKey: `${P}.l8.title`,
    xp: 100,
    steps: [
      { kind: "visual", lineKeys: [`${P}.l8.v1`, `${P}.l8.v2`, `${P}.l8.v3`] },
      {
        kind: "choose",
        promptKey: `${P}.l8.closeQ`,
        optionKeys: [`${P}.l8.closeA`, `${P}.l8.closeB`, `${P}.l8.closeC`],
        correctIndex: 0,
        explainKey: `${P}.l8.closeExplain`,
      },
      { kind: "insight", bodyKey: `${P}.l8.closingList` },
      {
        kind: "mission",
        titleKey: `${P}.l8.missionTitle`,
        hintKey: `${P}.l8.missionHint`,
        missionType: "sale_count",
        target: 1,
        bonusXp: 50,
        recordPath: "/app/record",
        recordType: "sale",
      },
    ],
  },
  {
    id: "bb-09-business-pulse",
    titleKey: `${P}.l9.title`,
    xp: 50,
    steps: [
      { kind: "insight", bodyKey: `${P}.l9.intro` },
      { kind: "visual", lineKeys: [`${P}.l9.n1`, `${P}.l9.n2`, `${P}.l9.n3`, `${P}.l9.n4`, `${P}.l9.n5`] },
      {
        kind: "choose",
        promptKey: `${P}.l9.debtQ`,
        optionKeys: [`${P}.l9.debtA`, `${P}.l9.debtB`, `${P}.l9.debtC`],
        correctIndex: 1,
        explainKey: `${P}.l9.debtExplain`,
        xp: 50,
      },
    ],
  },
  {
    id: "bb-10-ten-minute-owner",
    titleKey: `${P}.l10.title`,
    xp: 150,
    steps: [
      { kind: "insight", bodyKey: `${P}.l10.intro` },
      {
        kind: "multi_pick",
        promptKey: `${P}.l10.morningQ`,
        optionKeys: [`${P}.l10.m1`, `${P}.l10.m2`, `${P}.l10.m3`, `${P}.l10.m4`, `${P}.l10.m5`, `${P}.l10.mBad`],
        correctIndices: [0, 1, 2, 3, 4],
      },
      { kind: "insight", bodyKey: `${P}.l10.evening` },
      { kind: "insight", bodyKey: `${P}.l10.levelComplete` },
    ],
  },
];

export const BUSINESS_BASICS_LEVEL_ID = "business-basics";
export const BUSINESS_STARTER_BADGE = "business_starter";
export const BB_LESSON_IDS = BUSINESS_BASICS_LESSONS.map((l) => l.id);

export function isBusinessBasicsComplete(completedIds: string[]): boolean {
  return BB_LESSON_IDS.every((id) => completedIds.includes(id));
}

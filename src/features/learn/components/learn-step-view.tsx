"use client";

import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { LearnVoiceControls } from "@/features/learn/components/learn-voice-controls";
import {
  LearnContinueButton,
  LearnExplainCard,
  LearnInsightCard,
  LearnOptionButton,
  LearnQuizPrompt,
  LearnStepProgress,
  LearnStoryScene,
} from "@/features/learn/components/learn-ui";
import type { LearnStep } from "@/features/learn/types";
import { checkMissionProgress } from "@/services/learn-mission-service";
import { useTranslation } from "@/lib/i18n/context";
import { formatNgn } from "@/utils/money";
import { cn } from "@/lib/utils";

export function LearnStepView({
  step,
  stepIndex,
  totalSteps,
  businessId,
  onStepComplete,
  onWrong,
}: {
  step: LearnStep;
  stepIndex: number;
  totalSteps: number;
  businessId: string | null;
  onStepComplete: (bonusXp?: number) => void;
  onWrong: () => void;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [multiDone, setMultiDone] = useState(false);

  const missionQuery = useQuery({
    queryKey: ["learn-mission", businessId, step.kind === "mission" ? step.missionType : null],
    enabled: step.kind === "mission" && Boolean(businessId),
    queryFn: async () => {
      if (step.kind !== "mission" || !businessId) return { met: false, current: 0 };
      return checkMissionProgress(businessId, step.missionType, step.target);
    },
    refetchInterval: step.kind === "mission" ? 4000 : false,
  });

  const stepNum = stepIndex + 1;

  if (step.kind === "story") {
    const storyText = step.paragraphKeys.map((k) => t(k)).join(". ");
    return (
      <div className="learn-step space-y-5">
        <LearnStepProgress current={stepNum} total={totalSteps} />
        <LearnVoiceControls readText={storyText} />
        <LearnStoryScene
          paragraphKeys={step.paragraphKeys}
          sceneEmoji={step.sceneEmoji}
          characterName={step.characterName}
          translate={t}
        />
        <LearnContinueButton onClick={() => onStepComplete()} />
      </div>
    );
  }

  if (step.kind === "visual") {
    const visualText = step.lineKeys
      .map((k) => t(k))
      .filter((line) => line.trim() !== "↓" && !line.includes("↓"))
      .join(". ");
    return (
      <div className="learn-step space-y-5">
        <LearnStepProgress current={stepNum} total={totalSteps} />
        <LearnVoiceControls readText={visualText} />
        <div className="learn-visual-flow overflow-hidden rounded-3xl border border-primary/15 bg-card shadow-sm">
          {step.lineKeys.map((key, i) => {
            const line = t(key);
            const isArrow = line.trim() === "↓" || line.includes("↓");
            const isProfit = /profit|REMAINING/i.test(line);
            return (
              <div
                key={key}
                className={cn(
                  "px-4 py-3 font-mono text-xs sm:text-sm",
                  i > 0 && "border-t border-primary/10",
                  isArrow && "py-1 text-center text-primary/60",
                  isProfit && "learn-visual-profit bg-primary/[0.08] font-bold text-primary",
                )}
              >
                {line}
              </div>
            );
          })}
        </div>
        <LearnContinueButton onClick={() => onStepComplete()} />
      </div>
    );
  }

  if (step.kind === "insight") {
    const insightBody = t(step.bodyKey);
    return (
      <div className="learn-step space-y-5">
        <LearnStepProgress current={stepNum} total={totalSteps} />
        <LearnVoiceControls readText={insightBody} />
        <LearnInsightCard body={insightBody} />
        <LearnContinueButton onClick={() => onStepComplete()} />
      </div>
    );
  }

  if (step.kind === "mission") {
    const met = missionQuery.data?.met ?? false;
    const current = missionQuery.data?.current ?? 0;
    const progressPct = step.target > 0 ? Math.min(100, (current / step.target) * 100) : 0;
    return (
      <div className="learn-step space-y-5">
        <LearnStepProgress current={stepNum} total={totalSteps} />
        <div className="learn-mission-card overflow-hidden rounded-3xl border-2 border-amber-300/50 shadow-md">
          <div className="bg-gradient-to-r from-amber-500 to-amber-400 px-5 py-3">
            <p className="text-xs font-black uppercase tracking-wider text-amber-950">
              🎯 {t("app.learn.missionBadge")}
            </p>
          </div>
          <div className="space-y-3 bg-card p-5">
            <p className="text-lg font-extrabold">{t(step.titleKey)}</p>
            <p className="text-sm text-muted-foreground">{t(step.hintKey)}</p>
            <div className="h-3 overflow-hidden rounded-full bg-amber-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-primary transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs font-bold tabular-nums text-primary">
              {t("app.learn.missionProgress")
                .replace("{current}", String(current))
                .replace("{target}", String(step.target))}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Button className="min-h-12 rounded-2xl font-bold shadow-md" asChild>
            <Link
              to={step.recordPath}
              search={step.recordType ? { type: step.recordType } : undefined}
            >
              {t("app.learn.missionGo")}
            </Link>
          </Button>
          {met ? (
            <LearnContinueButton onClick={() => onStepComplete(step.bonusXp)} xpHint={step.bonusXp} />
          ) : (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 rounded-2xl font-semibold"
              onClick={() => onStepComplete(0)}
            >
              {t("app.learn.missionSkip")}
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (step.kind === "compare") {
    const prompt = t(step.promptKey);
    const labels = step.businesses.map((b) => t(b.labelKey));
    const pick = (index: number) => {
      if (revealed) return;
      setSelected(index);
      setRevealed(true);
      if (index !== step.correctIndex) onWrong();
    };
    return (
      <div className="learn-step space-y-5">
        <LearnStepProgress current={stepNum} total={totalSteps} />
        <LearnQuizPrompt>{prompt}</LearnQuizPrompt>
        <p className="text-xs text-muted-foreground">{t("app.learn.voiceHint")}</p>
        <LearnVoiceControls
          readText={`${prompt}. ${labels.map((l, i) => `${String.fromCharCode(65 + i)}. ${l}`).join(". ")}`}
          optionLabels={labels}
          disabled={revealed}
          onPickOption={pick}
        />
        <div className="space-y-2">
          {step.businesses.map((b, index) => {
            const profit = b.sales - b.costs;
            const isSelected = selected === index;
            const isCorrect = index === step.correctIndex;
            let variant = "border-border bg-card hover:bg-muted/40";
            if (revealed && isCorrect) variant = "border-primary bg-primary/10 ring-2 ring-primary/30";
            if (revealed && isSelected && !isCorrect) variant = "border-destructive/50 bg-destructive/10";
            return (
              <button
                key={b.labelKey}
                type="button"
                disabled={revealed}
                onClick={() => pick(index)}
                className={cn(
                  "w-full rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.99]",
                  variant,
                )}
              >
                <p className="font-bold">{t(b.labelKey)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("app.learn.compareLine")
                    .replace("{sales}", formatNgn(b.sales))
                    .replace("{costs}", formatNgn(b.costs))}
                </p>
                {revealed && isCorrect && (
                  <p className="mt-2 text-sm font-bold text-primary">
                    {t("app.learn.profitLine").replace("{profit}", formatNgn(profit))}
                  </p>
                )}
              </button>
            );
          })}
        </div>
        {revealed && (
          <LearnContinueButton
            onClick={() => onStepComplete(selected === step.correctIndex ? step.xp : undefined)}
            xpHint={selected === step.correctIndex ? step.xp : undefined}
          />
        )}
      </div>
    );
  }

  if (step.kind === "multi_pick") {
    const correctSet = new Set(step.correctIndices);
    const prompt = t(step.promptKey);
    const labels = step.optionKeys.map((key) => t(key));
    const toggle = (i: number) => {
      if (multiDone) return;
      setPicked((prev) => {
        const next = new Set(prev);
        if (next.has(i)) next.delete(i);
        else next.add(i);
        return next;
      });
    };
    const submitMulti = () => {
      const ok =
        picked.size === correctSet.size && [...correctSet].every((i) => picked.has(i));
      setMultiDone(true);
      if (ok) onStepComplete();
      else onWrong();
    };
    return (
      <div className="learn-step space-y-5">
        <LearnStepProgress current={stepNum} total={totalSteps} />
        <LearnQuizPrompt>{prompt}</LearnQuizPrompt>
        <p className="text-xs text-muted-foreground">{t("app.learn.multiHint")}</p>
        <LearnVoiceControls
          readText={`${prompt}. ${labels.map((l, i) => `${String.fromCharCode(65 + i)}. ${l}`).join(". ")}`}
          optionLabels={labels}
          disabled={multiDone}
          onToggleOption={toggle}
          onSpokenSubmit={submitMulti}
        />
        <div className="space-y-2">
          {step.optionKeys.map((key, i) => (
            <button
              key={key}
              type="button"
              disabled={multiDone}
              onClick={() => toggle(i)}
              className={cn(
                "min-h-12 w-full rounded-2xl border-2 px-4 py-2 text-left text-sm font-semibold transition-colors",
                picked.has(i) ? "border-primary bg-primary/10" : "border-border bg-card",
              )}
            >
              {t(key)}
            </button>
          ))}
        </div>
        {!multiDone && (
          <Button type="button" className="min-h-12 w-full rounded-2xl font-bold" onClick={submitMulti}>
            {t("app.learn.checkAnswer")}
          </Button>
        )}
        {multiDone && <LearnContinueButton onClick={() => onStepComplete()} />}
      </div>
    );
  }

  if (step.kind === "choose") {
    const isCorrect = revealed && selected === step.correctIndex ? true : false;
    const prompt = t(step.promptKey);
    const labels = step.optionKeys.map((key) => t(key));
    const pick = (index: number) => {
      if (revealed) return;
      setSelected(index);
      setRevealed(true);
      if (index !== step.correctIndex) onWrong();
    };
    return (
      <div className="learn-step space-y-5">
        <LearnStepProgress current={stepNum} total={totalSteps} />
        <LearnQuizPrompt>{prompt}</LearnQuizPrompt>
        <p className="text-xs text-muted-foreground">{t("app.learn.voiceHint")}</p>
        <LearnVoiceControls
          readText={`${prompt}. ${labels.map((l, i) => `${String.fromCharCode(65 + i)}. ${l}`).join(". ")}`}
          optionLabels={labels}
          disabled={revealed}
          onPickOption={pick}
        />
        <div className="space-y-3">
          {step.optionKeys.map((key, index) => (
            <LearnOptionButton
              key={key}
              letterIndex={index}
              label={t(key)}
              disabled={revealed}
              selected={selected === index}
              revealed={revealed}
              isCorrect={index === step.correctIndex}
              onClick={() => pick(index)}
            />
          ))}
        </div>
        {revealed && step.explainKey && (
          <LearnExplainCard
            text={t(step.explainKey)}
            correct={isCorrect}
            xp={isCorrect ? step.xp : undefined}
          />
        )}
        {revealed && (
          <LearnContinueButton
            onClick={() => onStepComplete(isCorrect ? step.xp : undefined)}
            xpHint={isCorrect ? step.xp : undefined}
          />
        )}
      </div>
    );
  }

  return null;
}

import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/features/app/app-shell";
import { BackLinkButton } from "@/features/app-layout/back-link-button";
import { LessonPlayerScreen } from "@/features/learn/lesson-player-screen";
import { useAuth } from "@/features/auth/auth-context";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { useTranslation } from "@/lib/i18n/context";

export const Route = createFileRoute("/app/learn/$lessonId")({
  component: LearnLessonPage,
});

function LearnLessonPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { data: businessData } = usePrimaryBusiness(profile?.id);
  const { lessonId } = Route.useParams();

  if (!profile) return null;

  return (
    <AppShell>
      <div className="flex items-center justify-between gap-2 pb-2">
        <BackLinkButton to="/app/learn" label={t("app.learn.backToPath")} />
      </div>
      <LessonPlayerScreen
        profileId={profile.id}
        lessonId={lessonId}
        businessId={businessData?.business?.id ?? null}
      />
    </AppShell>
  );
}

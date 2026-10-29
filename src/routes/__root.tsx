import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";
import { SiteFooter, SiteHeader } from "../components/site-shell";
import { AuthProvider, useAuth } from "@/features/auth/auth-context";
import { SitePreferencesProvider, useTranslation } from "../lib/i18n/context";
import { enMessages } from "../lib/i18n/messages/en";

function NotFoundContent() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">{t("errors.notFoundCode")}</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("errors.notFoundTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("errors.notFoundDesc")}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("errors.goHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function NotFoundComponent() {
  return (
    <SitePreferencesProvider>
      <NotFoundContent />
    </SitePreferencesProvider>
  );
}

function ErrorContent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("errors.errorTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("errors.errorDesc")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("errors.tryAgain")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("errors.goHome")}
          </a>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent(props: ErrorComponentProps) {
  return (
    <SitePreferencesProvider>
      <ErrorContent {...props} />
    </SitePreferencesProvider>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=5",
      },
      { title: enMessages.meta.siteName },
      { name: "description", content: enMessages.meta.defaultDescription },
      { name: "author", content: enMessages.meta.author },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/tijar-logo.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/tijar-logo.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/** Paths that use their own chrome (dashboard / shop / auth) — never show marketing header/footer. */
function isAppChromePath(pathname: string): boolean {
  return (
    pathname.startsWith("/app") ||
    pathname.startsWith("/shop") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/register/")
  );
}

function RootLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { session } = useAuth();

  // Logged-in users on product surfaces only see app/shop UI — no marketing nav/footer.
  const isLoggedInProductSurface =
    Boolean(session) &&
    (pathname.startsWith("/discover") ||
      pathname.startsWith("/translate") ||
      pathname.startsWith("/b/"));

  const showMarketingShell = !isAppChromePath(pathname) && !isLoggedInProductSurface;

  const shopFeed = pathname === "/shop" || pathname === "/shop/";

  return (
    <div className={shopFeed ? "h-dvh overflow-hidden bg-background text-foreground" : "min-h-screen bg-background text-foreground"}>
      {showMarketingShell && <SiteHeader />}
      <main id="main-content" className={shopFeed ? "h-full overflow-hidden" : undefined}>
        <Outlet />
      </main>
      {showMarketingShell && <SiteFooter />}
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <SitePreferencesProvider>
        <AuthProvider>
          <RootLayout />
          <Toaster richColors position="top-center" />
        </AuthProvider>
      </SitePreferencesProvider>
    </QueryClientProvider>
  );
}

"use client";

import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ensureSupabasePublicEnv } from "@/lib/supabase/bootstrap-env";
import { getSupabaseBrowserClient, primeSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseEnvPresent } from "@/lib/supabase/runtime-env";
import { fetchCurrentProfile } from "@/services/profile-service";
import type { Profile } from "@/types/database";

type AuthContextValue = {
  configured: boolean;
  configLoading: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [configLoading, setConfigLoading] = useState(() => !isSupabaseEnvPresent());
  const [configured, setConfigured] = useState(() => isSupabaseEnvPresent());
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const env = await ensureSupabasePublicEnv();
      if (cancelled) return;
      if (env) {
        primeSupabaseBrowserClient(env);
        setConfigured(true);
      }
      setConfigLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!configured) {
      setProfile(null);
      return;
    }
    const { profile: next } = await fetchCurrentProfile();
    setProfile(next);
  }, [configured]);

  useEffect(() => {
    if (configLoading) return;

    if (!configured) {
      setLoading(false);
      setSession(null);
      return;
    }

    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, [configLoading, configured]);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }
    void refreshProfile();
  }, [session, refreshProfile]);

  const value = useMemo(
    () => ({
      configured,
      configLoading,
      loading,
      session,
      user: session?.user ?? null,
      profile,
      refreshProfile,
    }),
    [configured, configLoading, loading, session, profile, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

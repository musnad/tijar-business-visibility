import { describe, expect, it } from "vitest";

import { isSupabaseConfigured } from "@/config/env";

describe("supabase env", () => {
  it("loads VITE_SUPABASE_* when .env.local is present", () => {
    // Vitest runs with vite env loading; CI may omit .env.local
    if (!import.meta.env.VITE_SUPABASE_URL) {
      expect(isSupabaseConfigured()).toBe(false);
      return;
    }
    expect(isSupabaseConfigured()).toBe(true);
    expect(import.meta.env.VITE_SUPABASE_URL).toContain("supabase.co");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the supabase-js module so no real network calls are made
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

describe("Supabase client module", () => {
  beforeEach(() => {
    vi.resetModules();
    // Provide env vars that the module reads at import time
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  });

  it("createBrowserSupabaseClient does not throw when env vars are present", async () => {
    const { createBrowserSupabaseClient } = await import(
      "../../apps/web/app/lib/supabase"
    );
    expect(() => createBrowserSupabaseClient()).not.toThrow();
  });

  it("createBrowserSupabaseClient returns an object with auth and from", async () => {
    const { createBrowserSupabaseClient } = await import(
      "../../apps/web/app/lib/supabase"
    );
    const client = createBrowserSupabaseClient();
    expect(client).toHaveProperty("auth");
    expect(client).toHaveProperty("from");
  });

  it("getSupabaseConfig returns url and key from env", async () => {
    const { getSupabaseConfig } = await import(
      "../../apps/web/app/lib/supabase"
    );
    const config = getSupabaseConfig();
    expect(config.url).toBe("https://test.supabase.co");
    expect(config.anonKey).toBe("test-anon-key");
  });
});

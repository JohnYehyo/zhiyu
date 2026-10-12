import { afterEach, expect, it, vi } from "vitest";
import { hasSupabaseConfig, hasWriteConfig, publicSupabaseKey } from "./config";

afterEach(() => vi.unstubAllEnvs());
it("accepts integration aliases without exposing the service role as a public key", () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", " ");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-legacy");
  vi.stubEnv("SUPABASE_SECRET_KEY", " ");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "private-legacy");
  vi.stubEnv("ADMIN_USER_ID", "11111111-1111-4111-8111-111111111111");
  expect(publicSupabaseKey()).toBe("public-legacy");
  expect(hasSupabaseConfig()).toBe(true);
  expect(hasWriteConfig()).toBe(true);
});
it("prefers nonblank canonical values over legacy aliases", () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "current-public");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "old-public");
  vi.stubEnv("SUPABASE_SECRET_KEY", "current-private");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "old-private");
  expect(publicSupabaseKey()).toBe("current-public");
});

import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { hasSupabaseConfig, hasWriteConfig, publicSupabaseKey } from "./config";
import * as config from "./config";

beforeEach(() => {
  for (const key of [
    "NEXT_PUBLIC_zhiyu_SUPABASE_URL",
    "NEXT_PUBLIC_zhiyu_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_zhiyu_SUPABASE_ANON_KEY",
    "zhiyu_SUPABASE_SECRET_KEY",
    "zhiyu_SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ADMIN_USER_ID",
  ])
    vi.stubEnv(key, "");
});

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
it("uses exactly the zhiyu names injected by Vercel without duplicate unprefixed variables", () => {
  vi.stubEnv("NEXT_PUBLIC_zhiyu_SUPABASE_URL", " https://zhiyu.supabase.co ");
  vi.stubEnv(
    "NEXT_PUBLIC_zhiyu_SUPABASE_PUBLISHABLE_KEY",
    " integrated-public ",
  );
  vi.stubEnv("zhiyu_SUPABASE_SECRET_KEY", " integrated-private ");
  vi.stubEnv("ADMIN_USER_ID", "11111111-1111-4111-8111-111111111111");
  expect(hasSupabaseConfig()).toBe(true);
  expect(hasWriteConfig()).toBe(true);
  expect(config.publicSupabaseUrl()).toBe("https://zhiyu.supabase.co");
  expect(publicSupabaseKey()).toBe("integrated-public");
});
it("prioritizes namespaced anon over an old unprefixed key and supports namespaced service_role", () => {
  vi.stubEnv("NEXT_PUBLIC_zhiyu_SUPABASE_URL", "https://zhiyu.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_zhiyu_SUPABASE_PUBLISHABLE_KEY", " ");
  vi.stubEnv("NEXT_PUBLIC_zhiyu_SUPABASE_ANON_KEY", "integrated-anon");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "previous-project-public");
  vi.stubEnv("zhiyu_SUPABASE_SERVICE_ROLE_KEY", "integrated-service-role");
  vi.stubEnv("ADMIN_USER_ID", "11111111-1111-4111-8111-111111111111");
  expect(publicSupabaseKey()).toBe("integrated-anon");
  expect(hasWriteConfig()).toBe(true);
});
it("prefers namespaced URL and never authorizes writes using only a public key or JWT secret", () => {
  vi.stubEnv("NEXT_PUBLIC_zhiyu_SUPABASE_URL", "https://zhiyu.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://old.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_zhiyu_SUPABASE_PUBLISHABLE_KEY", "integrated-public");
  vi.stubEnv("zhiyu_SUPABASE_JWT_SECRET", "unused-jwt-secret");
  vi.stubEnv("ADMIN_USER_ID", "11111111-1111-4111-8111-111111111111");
  expect(config.publicSupabaseUrl()).toBe("https://zhiyu.supabase.co");
  expect(hasSupabaseConfig()).toBe(true);
  expect(hasWriteConfig()).toBe(false);
});
it("configuration diagnostics identify the exact missing administrator without exposing values", () => {
  vi.stubEnv("NEXT_PUBLIC_zhiyu_SUPABASE_URL", "https://zhiyu.supabase.co");
  vi.stubEnv(
    "NEXT_PUBLIC_zhiyu_SUPABASE_PUBLISHABLE_KEY",
    "do-not-display-public-value",
  );
  vi.stubEnv("zhiyu_SUPABASE_SECRET_KEY", "do-not-display-secret-value");
  expect(config.writeConfigStatus()).toEqual({
    url: "configured",
    publicKey: "configured",
    serviceKey: "configured",
    adminUserId: "missing",
  });
  expect(JSON.stringify(config.writeConfigStatus())).not.toMatch(
    /do-not-display/,
  );
  expect(hasWriteConfig()).toBe(false);
});
it("diagnostics distinguish a malformed URL or UID from absent configuration, using the same write guard", () => {
  vi.stubEnv(
    "NEXT_PUBLIC_zhiyu_SUPABASE_URL",
    "https://example.supabase.co/dashboard",
  );
  vi.stubEnv("NEXT_PUBLIC_zhiyu_SUPABASE_ANON_KEY", "public");
  vi.stubEnv("zhiyu_SUPABASE_SERVICE_ROLE_KEY", "private");
  vi.stubEnv("ADMIN_USER_ID", "email@example.com");
  expect(config.writeConfigStatus()).toMatchObject({
    url: "invalid",
    adminUserId: "invalid",
  });
  vi.stubEnv("NEXT_PUBLIC_zhiyu_SUPABASE_URL", "https://zhiyu.supabase.co");
  vi.stubEnv("ADMIN_USER_ID", "11111111-1111-4111-8111-111111111111");
  expect(Object.values(config.writeConfigStatus())).toEqual([
    "configured",
    "configured",
    "configured",
    "configured",
  ]);
  expect(hasWriteConfig()).toBe(true);
});

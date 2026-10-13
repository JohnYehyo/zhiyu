import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const create = vi.hoisted(() =>
  vi.fn((url: string, key: string, options: unknown) => ({ url, key, options })),
);
vi.mock("@supabase/supabase-js", () => ({ createClient: create }));
import { getServiceSupabase } from "./service";

beforeEach(() => {
  create.mockClear();
  vi.stubEnv("ADMIN_USER_ID", "11111111-1111-4111-8111-111111111111");
  vi.stubEnv("NEXT_PUBLIC_zhiyu_SUPABASE_URL", "https://zhiyu.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_zhiyu_SUPABASE_PUBLISHABLE_KEY", "integrated-public");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://old.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "old-public");
  vi.stubEnv("zhiyu_SUPABASE_SECRET_KEY", "");
  vi.stubEnv("zhiyu_SUPABASE_SERVICE_ROLE_KEY", "integrated-role");
  vi.stubEnv("SUPABASE_SECRET_KEY", "old-secret");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "old-role");
});
afterEach(() => vi.unstubAllEnvs());

it("service client uses the integrated URL and private role instead of old-project credentials", () => {
  getServiceSupabase();
  expect(create).toHaveBeenCalledWith(
    "https://zhiyu.supabase.co",
    "integrated-role",
    expect.objectContaining({
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }),
  );
});
it("integrated secret takes precedence over integrated service_role", () => {
  vi.stubEnv("zhiyu_SUPABASE_SECRET_KEY", " integrated-secret ");
  getServiceSupabase();
  expect(create.mock.calls[0]?.[1]).toBe("integrated-secret");
});

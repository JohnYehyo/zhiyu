import { it, expect, vi, afterEach } from "vitest";
vi.mock("server-only", () => ({}));
const query = vi.hoisted(() => ({
  error: null as { message: string } | null,
  data: [] as unknown[],
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({ select: () => ({ order: async () => query }) }),
  }),
}));
import { getPublishedPosts } from "./posts";
afterEach(() => vi.unstubAllEnvs());
it("configured empty database remains empty, rather than inventing sample success", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public");
  query.data = [];
  query.error = null;
  expect(await getPublishedPosts()).toEqual([]);
});
it("configured query error is visible and never replaced by demos", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public");
  query.error = { message: "cloud failure" };
  await expect(getPublishedPosts()).rejects.toThrow(/读取/);
});
it("missing publishable key explicitly permits demos", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
  expect((await getPublishedPosts())[0].demo).toBe(true);
});

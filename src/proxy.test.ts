import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const auth = vi.hoisted(() => ({ getUser: vi.fn(async () => ({ data: { user: null } })) }));
vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn(() => ({ auth })) }));
vi.mock("./lib/config", () => ({
  hasSupabaseConfig: () => true,
  publicSupabaseUrl: () => "https://synthetic.supabase.co",
  publicSupabaseKey: () => "synthetic-public",
}));
import { proxy } from "./proxy";
import { createServerClient } from "@supabase/ssr";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://zhiyu-beta.vercel.app");
});
afterEach(() => vi.unstubAllEnvs());

it.each(["GET", "HEAD"])("keeps %s admin visits on the fixed upload origin before any session refresh", async method => {
  const request = new NextRequest("https://zhiyu-pfpeazfmj-johnyehyos-projects.vercel.app/admin/posts/8611d30d-543d-463c-99ef-06f4c54c7c5b?view=edit", { method });
  const response = await proxy(request);
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe("https://zhiyu-beta.vercel.app/admin/posts/8611d30d-543d-463c-99ef-06f4c54c7c5b?view=edit");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(createServerClient).not.toHaveBeenCalled();
});

it.each([
  ["https://zhiyu-beta.vercel.app/admin", "GET"],
  ["http://localhost:3102/admin/posts/new", "GET"],
  ["https://preview-synthetic.vercel.app/admin/demo", "GET"],
  ["https://preview-synthetic.vercel.app/api/admin/media", "POST"],
  ["https://preview-synthetic.vercel.app/admin/posts/new", "POST"],
])("does not redirect cookies or mutation bodies for %s %s", async (url, method) => {
  const response = await proxy(new NextRequest(url, { method }));
  expect(response.headers.get("location")).toBeNull();
  expect(auth.getUser).toHaveBeenCalledOnce();
});

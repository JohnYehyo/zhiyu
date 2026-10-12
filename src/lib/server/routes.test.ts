import { it, expect, vi, afterEach } from "vitest";
vi.mock("server-only", () => ({}));
const identity = vi.hoisted(() => ({
  user: null as { id: string } | null,
  error: null as { message: string } | null,
}));
vi.mock("../supabase/server", () => ({
  getServerSupabase: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: identity.user },
        error: identity.error,
      }),
      getSession: () => {
        throw Error("unverified session must never authorize");
      },
    },
  }),
}));
import { GET as list, POST as create } from "@/app/api/admin/posts/route";
import { GET as get, PATCH as patch } from "@/app/api/admin/posts/[id]/route";
import { POST as publish } from "@/app/api/admin/posts/[id]/publish/route";
import { POST as unpublish } from "@/app/api/admin/posts/[id]/unpublish/route";
import { POST as upload } from "@/app/api/admin/media/route";
import { POST as complete } from "@/app/api/admin/media/[id]/complete/route";
afterEach(() => {
  vi.unstubAllEnvs();
  identity.user = null;
  identity.error = null;
});
const context = {
  params: Promise.resolve({ id: "33333333-3333-4333-8333-333333333333" }),
};
it("every real admin handler fails closed with missing config", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
  const handlers = [
    list,
    create,
    get,
    patch,
    publish,
    unpublish,
    upload,
    complete,
  ];
  for (const handler of handlers) {
    const request = new Request("http://localhost/api/admin/posts", {
      method: handler === list || handler === get ? "GET" : "POST",
      headers: { origin: "http://localhost" },
    });
    const response = await handler(request, context);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "NOT_CONFIGURED" });
  }
});
it("verified anonymous/nonadmin identities are 401/403 and auth error cannot authorize a returned user", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "synthetic-public");
  vi.stubEnv("SUPABASE_SECRET_KEY", "synthetic-secret");
  vi.stubEnv("ADMIN_USER_ID", "11111111-1111-4111-8111-111111111111");
  const request = new Request("http://localhost/api/admin/posts");
  expect((await list(request)).status).toBe(401);
  identity.user = { id: "22222222-2222-4222-8222-222222222222" };
  expect((await list(request)).status).toBe(403);
  identity.user = { id: "11111111-1111-4111-8111-111111111111" };
  identity.error = { message: "invalid token" };
  expect((await list(request)).status).toBe(401);
});

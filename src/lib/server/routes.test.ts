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
import {
  GET as get,
  PATCH as patch,
  DELETE as remove,
} from "@/app/api/admin/posts/[id]/route";
import { POST as publish } from "@/app/api/admin/posts/[id]/publish/route";
import { POST as unpublish } from "@/app/api/admin/posts/[id]/unpublish/route";
import { POST as upload, GET as catalogue } from "@/app/api/admin/media/route";
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
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  const handlers = [
    list,
    create,
    get,
    patch,
    publish,
    unpublish,
    upload,
    complete,
    remove,
    catalogue,
  ];
  for (const handler of handlers) {
    const request = new Request("http://localhost/api/admin/posts", {
      method:
        handler === list || handler === get || handler === catalogue
          ? "GET"
          : handler === remove
            ? "DELETE"
            : "POST",
      headers: { origin: "http://localhost" },
    });
    const response = await handler(request, context);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "NOT_CONFIGURED" });
  }
});
it("catalogue and deletion require verified admin; DELETE rejects foreign Origin", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "synthetic-public");
  vi.stubEnv("SUPABASE_SECRET_KEY", "synthetic-secret");
  vi.stubEnv("ADMIN_USER_ID", "11111111-1111-4111-8111-111111111111");
  const read = new Request("http://localhost/api/admin/media");
  const deletion = () =>
    new Request("http://localhost/api/admin/posts/id", {
      method: "DELETE",
      headers: {
        origin: "http://localhost",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ revision: 1 }),
    });
  expect((await catalogue(read)).status).toBe(401);
  expect((await remove(deletion(), context)).status).toBe(401);
  identity.user = { id: "22222222-2222-4222-8222-222222222222" };
  expect((await catalogue(read)).status).toBe(403);
  expect((await remove(deletion(), context)).status).toBe(403);
  expect(
    (
      await remove(
        new Request("http://localhost/api/admin/posts/id", {
          method: "DELETE",
          headers: { origin: "https://foreign.example" },
        }),
        context,
      )
    ).status,
  ).toBe(403);
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

it("stale deployment upload requests explain the fixed site before signing or creating pending media", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "synthetic-public");
  vi.stubEnv("SUPABASE_SECRET_KEY", "synthetic-secret");
  vi.stubEnv("ADMIN_USER_ID", "11111111-1111-4111-8111-111111111111");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://zhiyu-beta.vercel.app");
  identity.user = { id: "11111111-1111-4111-8111-111111111111" };
  const origin = "https://zhiyu-pfpeazfmj-johnyehyos-projects.vercel.app";
  const response = await upload(new Request(`${origin}/api/admin/media`, {
    method: "POST", headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify({ filename: "test.jpg", contentType: "image/jpeg", size: 3667422 }),
  }));
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({ code: "USE_CANONICAL_SITE", error: expect.stringContaining("https://zhiyu-beta.vercel.app/admin") });
});

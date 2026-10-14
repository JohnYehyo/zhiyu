import { createClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({
  rows: [] as { owner: string; category: unknown }[],
  requests: [] as URL[],
  databaseError: false,
  invalidRange: false,
  user: null as { id: string } | null,
  authError: null as { message: string } | null,
}));
vi.mock("../supabase/service", () => ({
  getServiceSupabase: () =>
    createClient("https://unit.supabase.co", "synthetic-test-key", {
      auth: { persistSession: false },
      global: {
        fetch: async (input) => {
          const url = new URL(String(input));
          state.requests.push(url);
          if (state.databaseError)
            return new Response(JSON.stringify({ message: "private details", code: "42P01" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          const ownerFilter = url.searchParams.get("owner_id");
          const offset = Number(url.searchParams.get("offset") ?? 0);
          const limit = Number(url.searchParams.get("limit") ?? state.rows.length);
          if (state.invalidRange && offset >= state.rows.length)
            return new Response(JSON.stringify({ message: "Requested range not satisfiable", code: "PGRST103" }), {
              status: 416,
              headers: { "Content-Type": "application/json" },
            });
          const rows = state.rows
            .filter((row) => !ownerFilter || ownerFilter === `eq.${row.owner}`)
            .slice(offset, offset + limit)
            .map(({ category }) => ({ category }));
          return new Response(JSON.stringify(rows), {
            headers: { "Content-Type": "application/json" },
          });
        },
      },
    }),
}));
vi.mock("../supabase/server", () => ({
  getServerSupabase: async () => ({
    auth: {
      getUser: async () => ({ data: { user: state.user }, error: state.authError }),
      getSession: () => { throw new Error("Session data cannot authorize category reads"); },
    },
  }),
}));

import { listCategories } from "./category-repository";
import { GET } from "@/app/api/admin/categories/route";

const owner = "11111111-1111-4111-8111-111111111111";
const foreign = "22222222-2222-4222-8222-222222222222";
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://unit.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "synthetic-public");
  vi.stubEnv("SUPABASE_SECRET_KEY", "synthetic-secret");
  vi.stubEnv("ADMIN_USER_ID", owner);
});
afterEach(() => {
  vi.unstubAllEnvs();
  state.rows = [];
  state.requests = [];
  state.databaseError = false;
  state.invalidRange = false;
  state.user = null;
  state.authError = null;
});

it("reads only owned category fields, normalizing valid distinct names and excluding foreign drafts", async () => {
  state.rows = [
    { owner, category: " 日常碎片 " },
    { owner, category: "日常碎片" },
    { owner, category: "出去走走" },
    { owner, category: " " },
    { owner, category: null },
    { owner, category: { private: "private document" } },
    { owner, category: "超".repeat(61) },
    { owner: foreign, category: "PRIVATE_CATEGORY" },
  ];
  expect(await listCategories(owner)).toEqual(["出去走走", "日常碎片"]);
  const query = state.requests[0].searchParams;
  expect(state.requests[0].pathname).toBe("/rest/v1/draft_posts");
  expect(query.get("select")).toBe("category:draft->>category");
  expect(query.get("owner_id")).toBe(`eq.${owner}`);
  expect(query.get("order")).toBe("id.asc");
  expect(Number(query.get("limit"))).toBeLessThanOrEqual(1000);
});

it("continues past a full category page, with owner restriction on every request", async () => {
  state.rows = [
    ...Array.from({ length: 1000 }, () => ({ owner, category: "日常碎片" })),
    { owner, category: "最后一篇的分类" },
  ];
  expect(await listCategories(owner)).toContain("最后一篇的分类");
  expect(state.requests.length).toBeGreaterThan(1);
  for (const request of state.requests)
    expect(request.searchParams.get("owner_id")).toBe(`eq.${owner}`);
});

it("bounds category scans on a large archive rather than issuing unlimited reads", async () => {
  state.rows = Array.from({ length: 5500 }, (_, index) => ({
    owner,
    category: index === 5499 ? "超出建议范围" : "日常碎片",
  }));
  expect(await listCategories(owner)).toEqual(["日常碎片"]);
  expect(state.requests).toHaveLength(10);
  expect(state.requests.at(-1)?.searchParams.get("offset")).toBe("4500");
});

it("retains collected categories when an exact full last page is followed by a PostgREST end-of-range response", async () => {
  state.rows = Array.from({ length: 500 }, () => ({ owner, category: "日常碎片" }));
  state.invalidRange = true;
  expect(await listCategories(owner)).toEqual(["日常碎片"]);
});

it("category route requires fresh verified admin identity and never accepts an owner from the URL", async () => {
  const request = new Request(`http://localhost/api/admin/categories?owner_id=${foreign}`);
  expect((await GET(request)).status).toBe(401);
  state.user = { id: foreign };
  expect((await GET(request)).status).toBe(403);
  state.user = { id: owner };
  state.authError = { message: "invalid token" };
  expect((await GET(request)).status).toBe(401);
  expect(state.requests).toHaveLength(0);
  state.authError = null;
  state.rows = [{ owner, category: "私人分类" }, { owner: foreign, category: "PRIVATE_CATEGORY" }];
  const response = await GET(request);
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await response.json()).toEqual({ categories: ["私人分类"] });
});

it("category database failure remains an explicit safe error instead of pretending there are no saved categories", async () => {
  state.user = { id: owner };
  state.databaseError = true;
  const response = await GET(new Request("http://localhost/api/admin/categories"));
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({ code: "MIGRATION_REQUIRED" });
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});

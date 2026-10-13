import { createClient } from "@supabase/supabase-js";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({
  url: "",
  headers: new Headers(),
  rows: [] as unknown[],
  total: 24,
  invalidRange: false,
  rpcResult: null as string | null,
}));
vi.mock("../supabase/service", () => ({
  getServiceSupabase: () =>
    createClient("https://unit.supabase.co", "synthetic-test-key", {
      auth: { persistSession: false },
      global: {
        fetch: async (input, init) => {
          state.url = String(input);
          state.headers = new Headers(init?.headers);
          if (
            state.invalidRange &&
            new URL(state.url).searchParams.get("offset") !== "0"
          )
            return new Response(
              JSON.stringify({
                code: "PGRST103",
                message: "Requested range not satisfiable",
              }),
              { status: 416, headers: { "Content-Type": "application/json" } },
            );
            return new Response(JSON.stringify(state.url.includes("/rpc/") ? state.rpcResult : state.rows), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Content-Range": `0-0/${state.total}`,
            },
          });
        },
      },
    }),
}));
import * as repository from "./repository";
const owner = "11111111-1111-4111-8111-111111111111";
afterEach(() => {
  state.rows = [];
  state.invalidRange = false;
  state.rpcResult = null;
});

it("article search requests an owned, literal title match and a bounded ordered page", async () => {
  const page = await repository.listDraftPage(owner, {
    q: "今天,(雨)%_",
    status: "changed",
    page: 2,
    pageSize: 10,
  });
  const query = new URL(state.url).searchParams;
  expect(query.get("owner_id")).toBe(`eq.${owner}`);
  expect(query.get("status")).toBe("eq.changed");
  expect(query.get("draft->>title")).toBe("imatch.今天,\\(雨\\)%_");
  expect(query.get("offset")).toBe("10");
  expect(query.get("limit")).toBe("10");
  expect(query.get("order")).toBe("updated_at.desc,id.asc");
  expect(state.headers.get("Prefer")).toContain("count=exact");
  expect(page).toMatchObject({
    posts: [],
    pagination: { page: 2, pageSize: 10, total: 24 },
  });
});

it("media catalogue only requests owned ready assets and returns saved filename and date", async () => {
  state.rows = [
    {
      id: "44444444-4444-4444-8444-444444444444",
      owner_id: owner,
      storage_key: `blob/${owner}/44444444-4444-4444-8444-444444444444.mov`,
      mime_type: "video/quicktime",
      size: "200",
      status: "ready",
      original_name: "海边.mov",
      created_at: "2026-10-13T00:00:00Z",
    },
  ];
  const page = await repository.listMediaPage(owner, {
    kind: "video",
    page: 1,
    pageSize: 12,
  });
  const query = new URL(state.url).searchParams;
  expect(query.get("owner_id")).toBe(`eq.${owner}`);
  expect(query.get("status")).toBe("eq.ready");
  expect(query.get("mime_type")).toBe("like.video/%");
  expect(page.media[0]).toMatchObject({
    filename: "海边.mov",
    createdAt: "2026-10-13T00:00:00Z",
    size: 200,
  });
});
it("an old page after deletion recovers to the first page instead of claiming database failure", async () => {
  state.invalidRange = true;
  await expect(
    repository.listDraftPage(owner, {
      q: "",
      status: "all",
      page: 2,
      pageSize: 20,
    }),
  ).resolves.toMatchObject({ pagination: { page: 1 } });
});
it("deletion acknowledges the canonical UUID even when the request uses uppercase letters", async () => {
  const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  state.rpcResult = id;
  await expect(repository.deleteDraft(owner, id.toUpperCase(), 1)).resolves.toBe(id);
});

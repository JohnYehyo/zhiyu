import { it, expect, vi, afterEach } from "vitest";
vi.mock("server-only", () => ({}));
import { handleAdmin, readJson } from "./http";
afterEach(() => vi.unstubAllEnvs());
it("missing server credentials yields typed 503 rather than successful persistence", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
  const response = await handleAdmin(
    new Request("http://localhost/api/admin/posts", {
      method: "POST",
      headers: { origin: "http://localhost" },
    }),
    async () => ({ post: "should not persist" }),
  );
  expect(response.status).toBe(503);
  expect(await response.json()).toMatchObject({
    code: "NOT_CONFIGURED",
    error: expect.any(String),
  });
  expect(response.headers.get("cache-control")).toContain("no-store");
});
it("cross-origin request never reaches mutation even when config missing", async () => {
  const response = await handleAdmin(
    new Request("http://localhost/api/admin/posts", {
      method: "POST",
      headers: { origin: "https://evil.test" },
    }),
    async () => ({ ok: true }),
  );
  expect(response.status).toBe(403);
  expect(await response.json()).toMatchObject({ code: "CROSS_ORIGIN" });
});
it("malformed JSON, wrong content-type and oversized stream are rejected", async () => {
  await expect(
    readJson(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
    ),
  ).rejects.toThrow(/JSON/);
  await expect(
    readJson(new Request("http://localhost", { method: "POST", body: "{}" })),
  ).rejects.toThrow(/JSON/);
  await expect(
    readJson(
      new Request("http://localhost", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "x".repeat(1048577),
      }),
    ),
  ).rejects.toThrow(/过大/);
});

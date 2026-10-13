import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const cookies = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => Array.from(cookies, ([name, value]) => ({ name, value })),
    set: (name: string, value: string, options?: { maxAge?: number }) => {
      if (options?.maxAge === 0) cookies.delete(name);
      else cookies.set(name, value);
    },
  }),
}));
import { POST as login } from "@/app/api/auth/login/route";
import { POST as recovery } from "@/app/api/auth/recovery/route";
import { POST as confirm } from "@/app/api/auth/confirm/route";
const owner = "11111111-1111-4111-8111-111111111111";
const user = {
  id: owner,
  aud: "authenticated",
  role: "authenticated",
  email: "admin@example.test",
  email_confirmed_at: "2026-01-01T00:00:00Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  identities: [],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  is_anonymous: false,
};
const wire = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  if (url.includes("/auth/v1/recover")) {
    if (init?.method !== "POST") throw new Error("Recovery must use POST");
    return Response.json({});
  }
  if (url.includes("/auth/v1/token")) {
    const payload = Buffer.from(
      JSON.stringify({ sub: owner, exp: Math.floor(Date.now() / 1000) + 3600 }),
    ).toString("base64url");
    return Response.json({
      access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.synthetic`,
      refresh_token: "synthetic-refresh",
      token_type: "bearer",
      expires_in: 3600,
      user,
    });
  }
  if (url.includes("/auth/v1/user")) return Response.json(user);
  if (url.includes("/auth/v1/logout"))
    return new Response(null, { status: 204 });
  throw new Error("Unexpected test HTTP destination");
});
function request(path: string, body: unknown) {
  return new Request(`https://example.test${path}`, {
    method: "POST",
    headers: {
      Origin: "https://example.test",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  cookies.clear();
  wire.mockClear();
  vi.stubGlobal("fetch", wire);
  vi.stubEnv("NEXT_PUBLIC_zhiyu_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_zhiyu_SUPABASE_PUBLISHABLE_KEY", "synthetic-public");
  vi.stubEnv("zhiyu_SUPABASE_SECRET_KEY", "synthetic-private");
  vi.stubEnv("ADMIN_USER_ID", owner);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("real SSR client writes a login cookie that a fresh server client can verify", async () => {
  const response = await login(
    request("/api/auth/login", {
      email: "admin@example.test",
      password: "Synthetic password",
    }),
  );
  expect(response.status).toBe(200);
  expect(
    [...cookies.keys()].some((key) => key.startsWith("sb-test-auth-token")),
  ).toBe(true);
  expect(
    wire.mock.calls.some(([url]) => String(url).includes("/auth/v1/user")),
  ).toBe(true);
});

it("real SSR session cookies are cleared after a foreign administrator check", async () => {
  vi.stubEnv("ADMIN_USER_ID", "22222222-2222-4222-8222-222222222222");
  const response = await login(
    request("/api/auth/login", {
      email: "admin@example.test",
      password: "Synthetic password",
    }),
  );
  expect(response.status).toBe(403);
  expect(cookies.size).toBe(0);
});

it("real SSR recovery creates a verifier cookie and confirmation exchanges the code on the same site", async () => {
  const response = await recovery(
    request("/api/auth/recovery", { email: "admin@example.test" }),
  );
  expect(response.status).toBe(200);
  expect([...cookies.keys()].some((key) => key.includes("code-verifier"))).toBe(
    true,
  );
  const recoverCall = wire.mock.calls.find(([url]) =>
    String(url).includes("/auth/v1/recover"),
  );
  const body = JSON.parse(String(recoverCall?.[1]?.body));
  expect(body.code_challenge_method).toBe("s256");
  const confirmed = await confirm(
    request("/api/auth/confirm", { code: "synthetic-code" }),
  );
  expect(confirmed.status).toBe(200);
  expect(
    [...cookies.keys()].some(
      (key) =>
        key.startsWith("sb-test-auth-token") && !key.includes("code-verifier"),
    ),
  ).toBe(true);
});

import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({
  signIn: vi.fn(),
  recover: vi.fn(),
  signOut: vi.fn(),
  user: { id: "11111111-1111-4111-8111-111111111111" } as { id: string } | null,
  error: null as unknown,
}));
vi.mock("../supabase/server", () => ({
  getServerSupabase: async () => ({
    auth: {
      signInWithPassword: async (input: unknown) => {
        state.signIn(input);
        return { error: state.error };
      },
      resetPasswordForEmail: async (email: string, options: unknown) => {
        state.recover(email, options);
        return { error: state.error };
      },
      getUser: async () => ({ data: { user: state.user }, error: null }),
      signOut: async (input: unknown) => {
        state.signOut(input);
        return { error: null };
      },
    },
  }),
}));
import { POST as login } from "@/app/api/auth/login/route";
import { POST as recovery } from "@/app/api/auth/recovery/route";
function request(path: string, body: unknown, origin = "https://example.test") {
  return new Request(`https://example.test${path}`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  state.signIn.mockClear();
  state.recover.mockClear();
  state.signOut.mockClear();
  state.user = { id: "11111111-1111-4111-8111-111111111111" };
  state.error = null;
  vi.stubEnv("NEXT_PUBLIC_zhiyu_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_zhiyu_SUPABASE_PUBLISHABLE_KEY", "synthetic-public");
  vi.stubEnv("zhiyu_SUPABASE_SECRET_KEY", "synthetic-private");
  vi.stubEnv("ADMIN_USER_ID", state.user.id);
});
afterEach(() => vi.unstubAllEnvs());

it("login verifies provider credentials and exact administrator identity without echoing secrets", async () => {
  const body = {
    email: " admin@example.test ",
    password: " Synthetic password ",
  };
  let response = await login(request("/api/auth/login", body));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ redirectTo: "/admin" });
  expect(state.signIn).toHaveBeenCalledWith({
    email: "admin@example.test",
    password: body.password,
  });
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  state.user = { id: "22222222-2222-4222-8222-222222222222" };
  response = await login(request("/api/auth/login", body));
  expect(response.status).toBe(403);
  expect(state.signOut).toHaveBeenCalledWith({ scope: "local" });
  expect(await response.text()).not.toContain(body.password);
  state.user = null;
  expect((await login(request("/api/auth/login", body))).status).toBe(401);
});

it("recovery uses only the same-site callback and never accepts a caller redirect", async () => {
  const response = await recovery(
    request("/api/auth/recovery", { email: " admin@example.test " }),
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ accepted: true });
  expect(state.recover).toHaveBeenCalledWith("admin@example.test", {
    redirectTo: "https://example.test/auth/confirm",
  });
  state.recover.mockClear();
  expect(
    (
      await recovery(
        request("/api/auth/recovery", {
          email: "admin@example.test",
          redirectTo: "https://foreign.example",
        }),
      )
    ).status,
  ).toBe(400);
  expect(state.recover).not.toHaveBeenCalled();
});

it("a noncanonical Vercel recovery request is rejected before generating another verifier or mail", async () => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://zhiyu-beta.vercel.app");
  const response = await recovery(
    new Request("https://zhiyu-synthetic-user.vercel.app/api/auth/recovery", {
      method: "POST",
      headers: {
        Origin: "https://zhiyu-synthetic-user.vercel.app",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: "admin@example.test" }),
    }),
  );
  expect(response.status).toBe(409);
  expect((await response.json()).code).toBe("USE_CANONICAL_SITE");
  expect(state.recover).not.toHaveBeenCalled();
});

it("foreign origins and malformed credentials never reach the provider", async () => {
  expect(
    (
      await login(
        request(
          "/api/auth/login",
          { email: "admin@example.test", password: "synthetic" },
          "https://foreign.example",
        ),
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await recovery(
        request(
          "/api/auth/recovery",
          { email: "admin@example.test" },
          "https://foreign.example",
        ),
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await login(
        request("/api/auth/login", { email: "invalid", password: "" }),
      )
    ).status,
  ).toBe(400);
  expect(state.signIn).not.toHaveBeenCalled();
  expect(state.recover).not.toHaveBeenCalled();
});

it("network failures and throttling produce different safe feedback without retrying mail", async () => {
  state.error = new AuthRetryableFetchError("private-network-detail", 0);
  let response = await recovery(
    request("/api/auth/recovery", { email: "admin@example.test" }),
  );
  expect(response.status).toBe(503);
  expect((await response.json()).code).toBe("MAIL_NETWORK_UNAVAILABLE");
  expect(state.recover).toHaveBeenCalledTimes(1);
  response = await login(
    request("/api/auth/login", {
      email: "admin@example.test",
      password: "synthetic",
    }),
  );
  expect((await response.json()).code).toBe("AUTH_NETWORK_UNAVAILABLE");
  state.error = new AuthApiError(
    "private-provider-detail",
    429,
    "over_email_send_rate_limit",
  );
  response = await recovery(
    request("/api/auth/recovery", { email: "admin@example.test" }),
  );
  expect(response.status).toBe(429);
  expect(await response.text()).not.toMatch(/private-provider|admin@example/);
  state.error = new AuthApiError(
    "private-provider-detail",
    400,
    "invalid_credentials",
  );
  response = await login(
    request("/api/auth/login", {
      email: "admin@example.test",
      password: "synthetic",
    }),
  );
  expect(response.status).toBe(401);
  expect(await response.text()).not.toContain("private-provider-detail");
});

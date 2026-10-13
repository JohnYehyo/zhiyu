import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { AuthRetryableFetchError } from "@supabase/supabase-js";
vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  userError: false,
  expired: false,
  failure: null as {
    name?: string;
    status?: number;
    code?: string;
    message: string;
  } | null,
  verify: vi.fn(),
  exchange: vi.fn(),
  session: vi.fn(),
  update: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("../supabase/server", () => ({
  getServerSupabase: async () => ({
    auth: {
      exchangeCodeForSession: async (code: string) => {
        state.exchange(code);
        return {
          error:
            state.failure ??
            (state.expired ? { message: "private-code-error" } : null),
        };
      },
      setSession: async (input: unknown) => {
        state.session(input);
        return {
          error: state.expired ? { message: "private-session-error" } : null,
        };
      },
      verifyOtp: async (input: unknown) => {
        state.verify(input);
        return {
          error: state.expired ? { message: "private-provider-error" } : null,
        };
      },
      getUser: async () => ({
        data: { user: state.user },
        error: state.userError ? { message: "bad session" } : null,
      }),
      updateUser: async (input: unknown) => {
        state.update(input);
        return { error: null };
      },
      signOut: async (input: unknown) => {
        state.signOut(input);
        return { error: null };
      },
    },
  }),
}));
import { POST as confirm } from "@/app/api/auth/confirm/route";
import { POST as update } from "@/app/api/admin/password/route";
const owner = "11111111-1111-4111-8111-111111111111";
beforeEach(() => {
  state.user = { id: owner };
  state.userError = state.expired = false;
  state.failure = null;
  state.verify.mockClear();
  state.exchange.mockClear();
  state.session.mockClear();
  state.update.mockClear();
  state.signOut.mockClear();
  vi.stubEnv("NEXT_PUBLIC_zhiyu_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_zhiyu_SUPABASE_PUBLISHABLE_KEY", "synthetic-public");
  vi.stubEnv("zhiyu_SUPABASE_SECRET_KEY", "synthetic-secret");
  vi.stubEnv("ADMIN_USER_ID", owner);
});
afterEach(() => vi.unstubAllEnvs());
function request(path: string, body: unknown, origin = "http://localhost") {
  return new Request("http://localhost" + path, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
const token = { tokenHash: "synthetic-invitation-hash", type: "invite" };

it("distinguishes missing verifier, mismatched flow, expired code and network failures without leaking provider details", async () => {
  for (const [failure, status, code] of [
    [
      {
        name: "AuthPKCECodeVerifierMissingError",
        status: 400,
        message: "private-detail",
      },
      409,
      "VERIFIER_MISSING",
    ],
    [
      { code: "bad_code_verifier", status: 400, message: "private-detail" },
      409,
      "VERIFIER_MISMATCH",
    ],
    [
      { code: "flow_state_expired", status: 400, message: "private-detail" },
      401,
      "LINK_EXPIRED",
    ],
    [{ status: 0, message: "private-detail" }, 503, "AUTH_NETWORK_UNAVAILABLE"],
    [{ status: 503, message: "private-detail" }, 503, "AUTH_UNAVAILABLE"],
    [
      new AuthRetryableFetchError("private-detail", 503),
      503,
      "AUTH_UNAVAILABLE",
    ],
  ] as const) {
    state.failure = failure;
    const response = await confirm(
      request("/api/auth/confirm", { code: "synthetic-pkce-code" }),
    );
    expect(response.status).toBe(status);
    const data = await response.json();
    expect(data.code).toBe(code);
    expect(JSON.stringify(data)).not.toMatch(/private-detail|synthetic-pkce/);
  }
});

it("default email callbacks establish server cookies then check the administrator, without echoing credentials", async () => {
  const code = { code: "synthetic-pkce-code" };
  let result = await confirm(request("/api/auth/confirm", code));
  expect(result.status).toBe(200);
  expect(state.exchange).toHaveBeenCalledWith(code.code);
  expect(await result.text()).not.toContain(code.code);
  expect(state.verify).not.toHaveBeenCalled();
  const session = {
    accessToken: "synthetic-access",
    refreshToken: "synthetic-refresh",
  };
  result = await confirm(request("/api/auth/confirm", session));
  expect(result.status).toBe(200);
  expect(state.session).toHaveBeenCalledWith({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
  });
  expect(await result.text()).not.toMatch(/synthetic-access|synthetic-refresh/);
  state.user = { id: "22222222-2222-4222-8222-222222222222" };
  expect((await confirm(request("/api/auth/confirm", session))).status).toBe(
    403,
  );
  expect(state.signOut).toHaveBeenCalledWith({ scope: "local" });
  state.expired = true;
  result = await confirm(request("/api/auth/confirm", code));
  expect(result.status).toBe(401);
  expect(await result.text()).not.toMatch(/private-code|synthetic-pkce/);
  state.exchange.mockClear();
  expect(
    (
      await confirm(
        request("/api/auth/confirm", code, "https://foreign.example"),
      )
    ).status,
  ).toBe(403);
  expect(state.exchange).not.toHaveBeenCalled();
});

it("confirmation creates a session only through OTP verification followed by a verified administrator", async () => {
  const result = await confirm(request("/api/auth/confirm", token));
  expect(result.status).toBe(200);
  expect(await result.json()).toEqual({ redirectTo: "/admin/password" });
  expect(state.verify).toHaveBeenCalledWith({
    token_hash: token.tokenHash,
    type: "invite",
  });
  expect(result.headers.get("Cache-Control")).toBe("private, no-store");
});
it("expired links produce safe feedback, and foreign identities are cleared without changing a password", async () => {
  state.expired = true;
  let result = await confirm(request("/api/auth/confirm", token));
  expect(result.status).toBe(401);
  expect(await result.text()).not.toMatch(
    /synthetic-invitation|private-provider/,
  );
  state.expired = false;
  state.user = { id: "22222222-2222-4222-8222-222222222222" };
  result = await confirm(request("/api/auth/confirm", token));
  expect(result.status).toBe(403);
  expect(state.signOut).toHaveBeenCalledWith({ scope: "local" });
  expect(state.update).not.toHaveBeenCalled();
});
it("GET or cross-origin requests never consume confirmation hashes", async () => {
  // Next exposes only POST; handler also rejects cross-origin POST before verification.
  const route = await import("@/app/api/auth/confirm/route");
  expect("GET" in route).toBe(false);
  expect(
    (
      await confirm(
        request("/api/auth/confirm", token, "https://foreign.example"),
      )
    ).status,
  ).toBe(403);
  expect(state.verify).not.toHaveBeenCalled();
});
it("a valid recovery email follows the same administrator check; malformed input never reaches the provider", async () => {
  expect(
    (
      await confirm(
        request("/api/auth/confirm", {
          ...token,
          next: "https://foreign.example",
        }),
      )
    ).status,
  ).toBe(400);
  expect(state.verify).not.toHaveBeenCalled();
  const result = await confirm(
    request("/api/auth/confirm", { ...token, type: "recovery" }),
  );
  expect(result.status).toBe(200);
  expect(state.verify).toHaveBeenCalledWith({
    token_hash: token.tokenHash,
    type: "recovery",
  });
  expect(
    (
      await update(
        request(
          "/api/admin/password",
          {
            password: "Synthetic new password",
            confirmation: "Synthetic new password",
          },
          "https://foreign.example",
        ),
      )
    ).status,
  ).toBe(403);
  expect(state.update).not.toHaveBeenCalled();
});
it("password update requires a verified admin and matching passwords, and never echoes the password", async () => {
  const body = {
    password: "Synthetic new password",
    confirmation: "Synthetic new password",
  };
  state.user = null;
  expect((await update(request("/api/admin/password", body))).status).toBe(401);
  state.user = { id: "22222222-2222-4222-8222-222222222222" };
  expect((await update(request("/api/admin/password", body))).status).toBe(403);
  state.user = { id: owner };
  state.userError = true;
  expect((await update(request("/api/admin/password", body))).status).toBe(401);
  state.userError = false;
  expect(
    (
      await update(
        request("/api/admin/password", { ...body, confirmation: "mismatch" }),
      )
    ).status,
  ).toBe(400);
  expect(state.update).not.toHaveBeenCalled();
  const result = await update(request("/api/admin/password", body));
  expect(result.status).toBe(200);
  expect(await result.json()).toEqual({ updated: true });
  expect(state.update).toHaveBeenCalledWith({ password: body.password });
});

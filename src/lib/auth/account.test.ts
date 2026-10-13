import { expect, it } from "vitest";
import {
  parseConfirmation,
  parsePassword,
  readEmailCallback,
  rootEmailCallbackTarget,
  resolveEmailCallback,
} from "./account";

it("rejects credentials when either callback channel carries a provider error", () => {
  expect(
    resolveEmailCallback(
      { input: { code: "synthetic-code" } },
      { error: "expired" },
    ),
  ).toEqual({ error: "expired" });
  expect(
    resolveEmailCallback(
      { error: "expired" },
      {
        input: {
          accessToken: "synthetic-access",
          refreshToken: "synthetic-refresh",
        },
      },
    ),
  ).toEqual({ error: "expired" });
  expect(
    resolveEmailCallback(
      { input: { code: "synthetic-code" } },
      {
        input: {
          accessToken: "synthetic-access",
          refreshToken: "synthetic-refresh",
        },
      },
    ),
  ).toEqual({ error: "invalid" });
});

it("routes default dashboard invitation returns from the home page to the local callback without external redirects", () => {
  expect(
    rootEmailCallbackTarget(
      "/",
      "?next=https://foreign.example",
      "#access_token=synthetic-access&refresh_token=synthetic-refresh&type=invite",
    ),
  ).toBe(
    "/auth/confirm#access_token=synthetic-access&refresh_token=synthetic-refresh&type=invite",
  );
  expect(
    rootEmailCallbackTarget(
      "/",
      "?error=access_denied&error_code=otp_expired&error_description=private-detail",
      "",
    ),
  ).toBe("/auth/confirm?error=access_denied&error_code=otp_expired");
  expect(
    rootEmailCallbackTarget(
      "/",
      "?code=synthetic-code&next=https://foreign.example",
      "",
    ),
  ).toBe("/auth/confirm?code=synthetic-code");
  expect(
    rootEmailCallbackTarget("/auth/confirm", "?code=synthetic-code", ""),
  ).toBeNull();
  expect(
    rootEmailCallbackTarget("/", "?next=https://foreign.example", "#letter"),
  ).toBeNull();
});

it("accepts Supabase default PKCE codes and implicit sessions without arbitrary redirects", () => {
  expect(parseConfirmation({ code: "synthetic-pkce-code" })).toEqual({
    code: "synthetic-pkce-code",
  });
  expect(
    parseConfirmation({
      accessToken: "synthetic-access",
      refreshToken: "synthetic-refresh",
    }),
  ).toEqual({
    accessToken: "synthetic-access",
    refreshToken: "synthetic-refresh",
  });
  for (const input of [
    { code: "synthetic-pkce-code", next: "https://foreign.example" },
    {
      code: "synthetic-pkce-code",
      tokenHash: "synthetic-confirmation-hash",
      type: "invite",
    },
    { accessToken: "synthetic-access", refreshToken: "" },
  ])
    expect(() => parseConfirmation(input)).toThrow();
});

it("preserves provider expiry as a safe error instead of mislabeling it a missing link", () => {
  const state = readEmailCallback(
    new URLSearchParams({
      error: "access_denied",
      error_code: "otp_expired",
      error_description: "private-provider-detail",
      code: "synthetic-pkce-code",
    }),
  );
  expect(state).toEqual({ error: "expired" });
  expect(JSON.stringify(state)).not.toMatch(/private-provider|synthetic/);
  expect(readEmailCallback(new URLSearchParams("code=one&code=two"))).toEqual({
    error: "invalid",
  });
  expect(readEmailCallback(new URLSearchParams())).toBeNull();
  expect(
    readEmailCallback(new URLSearchParams({ code: "synthetic-pkce-code" })),
  ).toEqual({ input: { code: "synthetic-pkce-code" } });
  expect(
    readEmailCallback(
      new URLSearchParams({
        access_token: "synthetic-access",
        refresh_token: "synthetic-refresh",
        type: "recovery",
      }),
    ),
  ).toEqual({
    input: {
      accessToken: "synthetic-access",
      refreshToken: "synthetic-refresh",
    },
  });
});

it("accepts only invite/recovery hashes and refuses arbitrary redirects or extra claims", () => {
  expect(
    parseConfirmation({
      tokenHash: "synthetic-confirmation-hash",
      type: "invite",
    }),
  ).toEqual({ tokenHash: "synthetic-confirmation-hash", type: "invite" });
  for (const input of [
    { tokenHash: "", type: "invite" },
    { tokenHash: "synthetic-confirmation-hash", type: "signup" },
    {
      tokenHash: "synthetic-confirmation-hash",
      type: "recovery",
      next: "https://foreign.example",
    },
  ]) {
    expect(() => parseConfirmation(input)).toThrow();
  }
});
it("password setup preserves the exact password and requires confirmation before update", () => {
  expect(
    parsePassword({
      password: "  Synthetic password  ",
      confirmation: "  Synthetic password  ",
    }),
  ).toBe("  Synthetic password  ");
  for (const input of [
    { password: "short", confirmation: "short" },
    { password: "Synthetic password", confirmation: "different" },
    {
      password: "Synthetic password",
      confirmation: "Synthetic password",
      userId: "foreign-user",
    },
  ]) {
    expect(() => parsePassword(input)).toThrow();
  }
});

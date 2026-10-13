import { AuthApiError } from "@supabase/supabase-js";
import { expect, it, vi } from "vitest";
import { requestPasswordRecovery } from "./recovery";

it("requests Supabase recovery for the existing email and same-site callback", async () => {
  const auth = {
    resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: null })),
  };
  await requestPasswordRecovery(
    auth,
    " admin@example.test ",
    "https://example.test/auth/confirm",
  );
  expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(
    "admin@example.test",
    { redirectTo: "https://example.test/auth/confirm" },
  );
});

it("reports provider throttling instead of claiming that another mail was sent", async () => {
  const auth = {
    resetPasswordForEmail: vi.fn(async () => ({
      data: null,
      error: new AuthApiError(
        "private-provider-detail",
        429,
        "over_email_send_rate_limit",
      ),
    })),
  };
  await expect(
    requestPasswordRecovery(
      auth,
      "admin@example.test",
      "https://example.test/auth/confirm",
    ),
  ).rejects.toMatchObject({ code: "MAIL_RATE_LIMIT", status: 429 });
});

it("hides provider details on other mail failures", async () => {
  const auth = {
    resetPasswordForEmail: vi.fn(async () => ({
      data: null,
      error: new AuthApiError("private-provider-detail", 500, undefined),
    })),
  };
  await expect(
    requestPasswordRecovery(
      auth,
      "admin@example.test",
      "https://example.test/auth/confirm",
    ),
  ).rejects.toMatchObject({ code: "MAIL_UNAVAILABLE" });
  await expect(
    requestPasswordRecovery(
      auth,
      "admin@example.test",
      "https://example.test/auth/confirm",
    ),
  ).rejects.not.toThrow("private-provider-detail");
});

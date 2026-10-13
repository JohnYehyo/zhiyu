import { expect, it } from "vitest";
import { parseConfirmation, parsePassword } from "./account";

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

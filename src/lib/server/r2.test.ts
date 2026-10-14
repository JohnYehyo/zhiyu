import { vi, it, expect, beforeEach, afterEach, describe } from "vitest";
vi.mock("server-only", () => ({}));
import { getR2ConfigStatus, hasR2Config, r2Storage } from "./r2";
afterEach(() => vi.unstubAllEnvs());
it("signs only the configured R2 host/key with required type, exact length and no-overwrite header without networking", async () => {
  vi.stubEnv("R2_ACCOUNT_ID", "0123456789abcdef0123456789abcdef");
  vi.stubEnv("R2_ACCESS_KEY_ID", "synthetic-test-access");
  vi.stubEnv("R2_SECRET_ACCESS_KEY", "synthetic-test-secret");
  vi.stubEnv("R2_BUCKET_NAME", "test-bucket");
  vi.stubEnv("R2_KEY_PREFIX", "blob");
  vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", "https://media.test");
  const value = await r2Storage().sign(
    "blob/11111111-1111-4111-8111-111111111111/44444444-4444-4444-8444-444444444444.jpg",
    "image/jpeg",
    100,
  );
  const url = new URL(value);
  expect(url.hostname).toBe(
    "0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com",
  );
  expect(url.pathname).toContain("/blob/11111111-1111-4111-8111-111111111111/");
  expect(url.searchParams.get("X-Amz-SignedHeaders")).toBe(
    "content-length;content-type;host;if-none-match",
  );
  expect(url.searchParams.get("X-Amz-Expires")).toBe("300");
  expect(url.searchParams.has("x-amz-checksum-crc32")).toBe(false);
});
it("empty R2 keys fail closed", () => {
  vi.stubEnv("R2_SECRET_ACCESS_KEY", "");
  expect(hasR2Config()).toBe(false);
  expect(() => r2Storage()).toThrow(/尚未配置/);
});

describe("cloud upload configuration readiness", () => {
  beforeEach(() => {
    vi.stubEnv("R2_ACCOUNT_ID", "0123456789abcdef0123456789abcdef");
    vi.stubEnv("R2_ACCESS_KEY_ID", "synthetic-test-access");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "synthetic-test-secret");
    vi.stubEnv("R2_BUCKET_NAME", "blog");
    vi.stubEnv("R2_KEY_PREFIX", "blob");
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", "https://media.test");
  });

  it("rejects missing storage with an upload-specific error and safe field names", () => {
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "");
    expect(() => r2Storage()).toThrowError(
      expect.objectContaining({ status: 503, code: "STORAGE_NOT_CONFIGURED" }),
    );
    expect(() => r2Storage()).toThrow(/图片.*视频/);
    expect(() => r2Storage()).toThrow(/R2_SECRET_ACCESS_KEY/);
    expect(() => r2Storage()).not.toThrow(/本地预览|synthetic-test|media\.test/);
  });

  it("accepts the blog bucket with the default blob prefix and an uppercase account", () => {
    vi.stubEnv("R2_ACCOUNT_ID", "0123456789ABCDEF0123456789ABCDEF");
    vi.stubEnv("R2_KEY_PREFIX", undefined);
    const status = getR2ConfigStatus();
    expect(status).toEqual({
      configured: true,
      fields: {
        R2_ACCOUNT_ID: "configured",
        R2_ACCESS_KEY_ID: "configured",
        R2_SECRET_ACCESS_KEY: "configured",
        R2_BUCKET_NAME: "configured",
        R2_KEY_PREFIX: "configured",
        NEXT_PUBLIC_MEDIA_BASE_URL: "configured",
      },
      missing: [],
      invalid: [],
    });
    expect(hasR2Config()).toBe(true);
  });

  it.each([
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
    "NEXT_PUBLIC_MEDIA_BASE_URL",
  ])("reports required field %s as missing without leaking configured values", (field) => {
    vi.stubEnv(field, " \t ");
    const status = getR2ConfigStatus();
    expect(status.configured).toBe(false);
    expect(status.missing).toEqual([field]);
    expect(status.invalid).toEqual([]);
    expect(status.fields[field as keyof typeof status.fields]).toBe("missing");
    expect(hasR2Config()).toBe(false);
    expect(JSON.stringify(status)).not.toMatch(/synthetic-test|media\.test|0123456789/);
  });

  it.each([
    ["R2_ACCOUNT_ID", "1234"],
    ["R2_ACCOUNT_ID", "g123456789abcdef0123456789abcdef"],
    ["R2_ACCOUNT_ID", " 0123456789abcdef0123456789abcdef"],
    ["R2_KEY_PREFIX", "blog"],
    ["R2_KEY_PREFIX", ""],
    ["NEXT_PUBLIC_MEDIA_BASE_URL", "http://media.test"],
    ["NEXT_PUBLIC_MEDIA_BASE_URL", "https://user:password@media.test"],
    ["NEXT_PUBLIC_MEDIA_BASE_URL", "https://media.test/path"],
    ["NEXT_PUBLIC_MEDIA_BASE_URL", "https://media.test/?private=value"],
    ["NEXT_PUBLIC_MEDIA_BASE_URL", "https://media.test/#private"],
    ["NEXT_PUBLIC_MEDIA_BASE_URL", "not-a-url"],
  ])("reports invalid %s without exposing its rejected value", (field, value) => {
    vi.stubEnv(field, value);
    const status = getR2ConfigStatus();
    expect(status.configured).toBe(false);
    expect(status.missing).toEqual([]);
    expect(status.invalid).toEqual([field]);
    expect(status.fields[field as keyof typeof status.fields]).toBe("invalid");
    expect(hasR2Config()).toBe(false);
    expect(() => r2Storage()).toThrowError(
      expect.objectContaining({ status: 503, code: "STORAGE_NOT_CONFIGURED" }),
    );
    expect(() => r2Storage()).not.toThrow(/media\.test|user:password|private=value|not-a-url/);
  });

  it("collects missing and invalid names so one correction need not hide another", () => {
    vi.stubEnv("R2_ACCESS_KEY_ID", undefined);
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "");
    vi.stubEnv("R2_KEY_PREFIX", "different-prefix");
    const status = getR2ConfigStatus();
    expect(status.missing).toEqual(["R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"]);
    expect(status.invalid).toEqual(["R2_KEY_PREFIX"]);
    expect(status.configured).toBe(false);
  });
});

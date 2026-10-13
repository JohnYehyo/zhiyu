import { afterEach, expect, it, vi } from "vitest";
import { putFile, validateUpload } from "./api";
afterEach(() => vi.unstubAllGlobals());

it("transmits the original File with signed headers and reports progress, never setting Content-Length", async () => {
  const file = new File(["photo"], "照片.jpg", { type: "image/jpeg" });
  let body: unknown;
  const headers: Record<string, string> = {};
  const progress: number[] = [];
  vi.stubGlobal(
    "XMLHttpRequest",
    class {
      status = 200;
      timeout = 0;
      upload = {
      onprogress: (event: {
          lengthComputable: boolean;
          loaded: number;
          total: number;
      }) => { void event; },
      };
      onload = () => {};
      onerror = () => {};
      ontimeout = () => {};
      open(method: string, url: string) {
        expect([method, url]).toEqual(["PUT", "https://upload.test/object"]);
      }
      setRequestHeader(name: string, value: string) {
        headers[name] = value;
      }
      send(value: unknown) {
        body = value;
        this.upload.onprogress({ lengthComputable: true, loaded: 5, total: 5 });
        this.onload();
      }
    },
  );
  await putFile(
    file,
    {
      media: {
        id: "id",
        storageKey: "key",
        status: "pending",
        size: 5,
        mimeType: "image/jpeg",
      },
      uploadUrl: "https://upload.test/object",
      uploadHeaders: { "Content-Type": "image/jpeg", "If-None-Match": "*" },
    },
    (value) => progress.push(value),
  );
  expect(body).toBe(file);
  expect(headers).toEqual({
    "Content-Type": "image/jpeg",
    "If-None-Match": "*",
  });
  expect(progress).toEqual([100]);
});
it("video and image limits are distinct and unsafe formats cannot reach upload", () => {
  expect(() =>
    validateUpload(
      { type: "video/quicktime", size: 25 * 1024 * 1024 },
      "video",
    ),
  ).not.toThrow();
  expect(() =>
    validateUpload({ type: "image/jpeg", size: 25 * 1024 * 1024 }, "image"),
  ).toThrow(/大小/);
  expect(() =>
    validateUpload({ type: "text/html", size: 100 }, "image"),
  ).toThrow(/JPEG/);
});

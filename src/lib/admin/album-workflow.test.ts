import { describe, expect, it, vi } from "vitest";
import { ApiError, type PendingUpload } from "./api";
import type { AlbumPhoto } from "../album-types";
import type { MediaRecord } from "../types";
import { AlbumAddition, albumUpdatePayload, type AlbumUploadTransport } from "./album-workflow";

const pending: PendingUpload = {
  media: { id: "media-1", storageKey: "blob/image.jpg", mimeType: "image/jpeg", size: 5, status: "pending" },
  uploadUrl: "https://upload.test/image",
  uploadHeaders: { "Content-Type": "image/jpeg", "If-None-Match": "*" },
};
const ready: MediaRecord = { ...pending.media, status: "ready" };
const photo: AlbumPhoto = {
  id: "photo-1", mediaId: ready.id, storageKey: ready.storageKey,
  revision: 2, published: false, caption: "", alt: "", date: "",
  createdAt: "2026-10-14T00:00:00Z", updatedAt: "2026-10-14T00:00:00Z",
};

function setup(options: { confirmFails?: number; addFails?: number; putFails?: boolean; duplicate?: boolean } = {}) {
  const calls: { sign: number; put: number; confirm: string[]; add: unknown[] } = { sign: 0, put: 0, confirm: [], add: [] };
  const transport: AlbumUploadTransport = {
    async sign() { calls.sign++; return pending; },
    async put(_file, _pending, progress) {
      calls.put++; progress(100);
      if (options.putFails) throw new Error("connection interrupted");
    },
    async confirm(id) {
      calls.confirm.push(id);
      if ((options.confirmFails ?? 0) > 0) { options.confirmFails!--; throw new Error("HEAD not ready"); }
      return ready;
    },
    async create(input) {
      calls.add.push(input);
      if (options.duplicate) throw new ApiError("already added", 409, "ALBUM_DUPLICATE");
      if ((options.addFails ?? 0) > 0) { options.addFails!--; throw new Error("album temporarily unavailable"); }
      return photo;
    },
  };
  return { workflow: new AlbumAddition(transport, () => {}), calls };
}

describe("album upload recovery", () => {
  it("keeps the original pending identity when confirmation fails and retries HEAD without signing or uploading again", async () => {
    const { workflow, calls } = setup({ confirmFails: 1 });
    await workflow.upload(new File(["photo"], "image.jpg", { type: "image/jpeg" }));
    expect(workflow.state.phase).toBe("pending");
    expect(workflow.state.pending?.media.id).toBe("media-1");
    expect(await workflow.retry()).toEqual(photo);
    expect(calls).toEqual({ sign: 1, put: 1, confirm: ["media-1", "media-1"], add: [{ mediaId: "media-1", caption: "", alt: "", date: "" }] });
  });
  it("preserves a ready image after album creation fails, retrying only creation", async () => {
    const { workflow, calls } = setup({ addFails: 1 });
    await workflow.upload(new File(["photo"], "image.jpg", { type: "image/jpeg" }));
    expect(workflow.state.phase).toBe("ready");
    expect(workflow.state.media?.id).toBe("media-1");
    expect(await workflow.retry()).toEqual(photo);
    expect(calls.sign).toBe(1);
    expect(calls.put).toBe(1);
    expect(calls.confirm).toEqual(["media-1"]);
    expect(calls.add).toEqual([{ mediaId: "media-1", caption: "", alt: "", date: "" }, { mediaId: "media-1", caption: "", alt: "", date: "" }]);
  });
  it("allows confirmation after an uncertain PUT without sending a second PUT", async () => {
    const { workflow, calls } = setup({ putFails: true });
    await workflow.upload(new File(["photo"], "image.jpg", { type: "image/jpeg" }));
    expect(workflow.state.phase).toBe("pending");
    expect(await workflow.retry()).toEqual(photo);
    expect(calls.put).toBe(1);
  });
  it("clears a duplicate addition so the user can choose a different image", async () => {
    const { workflow } = setup({ duplicate: true });
    await workflow.select(ready);
    expect(workflow.state.phase).toBe("duplicate");
    expect(workflow.state.pending).toBeUndefined();
    expect(workflow.state.media).toBeUndefined();
    expect(workflow.state.error).toContain("already added");
  });
  it("serializes rapid additions and rejects video or unfinished素材 before creating a row", async () => {
    const { workflow, calls } = setup();
    const first = workflow.select(ready);
    const second = workflow.select(ready);
    await Promise.all([first, second]);
    expect(calls.add).toHaveLength(1);
    await workflow.select({ ...ready, id: "video", mimeType: "video/mp4" });
    await workflow.select({ ...ready, status: "pending" });
    expect(calls.add).toHaveLength(1);
    expect(workflow.state.error).toBeTruthy();
  });
});

it("publishing captures the latest local fields with the selected revision and no mutable form reference", () => {
  const draft = { caption: "今天的公园", alt: "草地旁的花", date: "2026-10-14" };
  const payload = albumUpdatePayload(photo, draft, true);
  draft.caption = "edited after request";
  expect(payload).toEqual({ revision: 2, caption: "今天的公园", alt: "草地旁的花", date: "2026-10-14", published: true });
});

it("retains the file after an incomplete PUT and retries PUT only after confirming absence", async () => {
  const file = new File(["photo"], "image.jpg", { type: "image/jpeg" });
  const calls: string[] = [];
  let uploadFails = true;
  let confirmCount = 0;
  const transport: AlbumUploadTransport = {
    async sign() { calls.push("sign"); return pending; },
    async put(actualFile, actualPending) {
      calls.push("put"); expect(actualFile).toBe(file); expect(actualPending.media.id).toBe("media-1");
      if (uploadFails) throw new Error("offline");
    },
    async confirm() { calls.push("confirm"); if (confirmCount++ === 0) throw new ApiError("not uploaded", 409, "UPLOAD_INCOMPLETE"); return ready; },
    async create() { calls.push("create"); return photo; },
  };
  const recovery = new AlbumAddition(transport, () => {});
  await recovery.upload(file);
  uploadFails = false;
  expect(await recovery.retry()).toEqual(photo);
  expect(calls).toEqual(["sign", "put", "confirm", "put", "confirm", "create"]);
});

it("does not reupload when the confirmation service is unavailable or returns a different media identity", async () => {
  let puts = 0;
  let wrongIdentity = false;
  const recovery = new AlbumAddition({
    async sign() { return pending; },
    async put() { puts++; throw new Error("offline"); },
    async confirm() { if (!wrongIdentity) throw new ApiError("unavailable", 503, "STORAGE_UNAVAILABLE"); return { ...ready, id: "another-file" }; },
    async create() { throw new Error("must not create"); },
  }, () => {});
  await recovery.upload(new File(["photo"], "image.jpg", { type: "image/jpeg" }));
  expect(await recovery.retry()).toBeNull();
  wrongIdentity = true;
  expect(await recovery.retry()).toBeNull();
  expect(puts).toBe(1);
  expect(recovery.state.pending?.media.id).toBe("media-1");
});

it("safely replaces an expired signature only after confirming that the old object is absent", async () => {
  vi.useFakeTimers();
  try {
    const calls: string[] = [];
    let signs = 0;
    const recovery = new AlbumAddition({
      async sign() { calls.push("sign"); signs++; return { ...pending, media: { ...pending.media, id: `media-${signs}` } }; },
      async put(_file, current) { calls.push(`put:${current.media.id}`); if (signs === 1) throw new Error("offline"); },
      async confirm(id) { calls.push(`confirm:${id}`); if (id === "media-1") throw new ApiError("missing", 409, "UPLOAD_INCOMPLETE"); return { ...ready, id }; },
      async create(input) { calls.push(`create:${input.mediaId}`); return photo; },
    }, () => {});
    await recovery.upload(new File(["photo"], "image.jpg", { type: "image/jpeg" }));
    vi.advanceTimersByTime(301_000);
    expect(await recovery.retry()).toEqual(photo);
    expect(calls).toEqual(["sign", "put:media-1", "confirm:media-1", "sign", "put:media-2", "confirm:media-2", "create:media-2"]);
  } finally { vi.useRealTimers(); }
});

it("captures collection on create and publish without changing published state implicitly", async () => {
  const { workflow, calls } = setup();
  await workflow.select(ready, "collection-a");
  expect(calls.add).toEqual([{ mediaId: "media-1", caption: "", alt: "", date: "", collectionId: "collection-a" }]);
  expect(albumUpdatePayload(photo, { caption: "", alt: "", date: "", collectionId: null }, true)).toMatchObject({ collectionId: null, published: true });
});

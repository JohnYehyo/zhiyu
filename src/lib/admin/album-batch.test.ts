import { describe, expect, it } from "vitest";
import { AlbumBatch } from "./album-batch";
import { ApiError } from "./api";
import type { AlbumUploadTransport } from "./album-workflow";
import type { AlbumPhoto } from "../album-types";

function setup() {
  const calls: string[] = [];
  const failures = new Set(["bad.jpg"]);
  const transport: AlbumUploadTransport = {
    async sign(file) { calls.push(`sign:${file.name}`); return { media: { id: file.name, storageKey: file.name, mimeType: file.type, size: file.size, status: "pending" }, uploadUrl: "https://upload.test/file", uploadHeaders: { "Content-Type": file.type, "If-None-Match": "*" } }; },
    async put(file, _pending, progress) { calls.push(`put:${file.name}`); progress(50); if (failures.has(file.name)) throw new Error("offline"); },
    async confirm(id) { calls.push(`confirm:${id}`); if (failures.has(id)) throw new ApiError("missing", 409, "UPLOAD_INCOMPLETE"); return { id, storageKey: id, mimeType: "image/jpeg", size: 1, status: "ready" }; },
    async create(input) { calls.push(`create:${input.mediaId}:${input.collectionId}`); return { ...input, id: input.mediaId, storageKey: input.mediaId, revision: 1, published: false, createdAt: "", updatedAt: "" } as AlbumPhoto; },
  };
  return { batch: new AlbumBatch(transport, () => {}), calls, failures };
}
const files = () => ["good.jpg", "bad.jpg", "last.jpg"].map((name) => new File(["x"], name, { type: "image/jpeg" }));

describe("album batch queue", () => {
  it("continues after a failure, captures one collection and retries only failed entries without uploading completed photos", async () => {
    const { batch, calls, failures } = setup();
    batch.enqueue(files(), "collection-a");
    expect(batch.hasPending).toBe(true);
    await batch.run();
    expect(batch.items.map((item) => item.state.phase)).toEqual(["done", "pending", "done"]);
    expect(batch.hasPending).toBe(true);
    failures.clear();
    await batch.retryFailed();
    expect(batch.items.map((item) => item.state.phase)).toEqual(["done", "done", "done"]);
    expect(batch.hasPending).toBe(false);
    expect(calls.filter((call) => call.startsWith("sign:"))).toEqual(["sign:good.jpg", "sign:bad.jpg", "sign:last.jpg"]);
    expect(calls.filter((call) => call.startsWith("create:"))).toEqual(["create:good.jpg:collection-a", "create:last.jpg:collection-a", "create:bad.jpg:collection-a"]);
  });
  it("does not enqueue the same File twice or allow concurrent queue runs", async () => {
    const { batch, calls } = setup();
    const file = files()[0];
    batch.enqueue([file, file], null);
    batch.enqueue([file], "other");
    expect(batch.items).toHaveLength(1);
    await Promise.all([batch.run(), batch.run()]);
    expect(calls.filter((call) => call.startsWith("create:"))).toEqual(["create:good.jpg:null"]);
  });
  it("retains distinct files even when names match and keeps each identity on retry", async () => {
    const { batch, failures } = setup();
    failures.clear();
    batch.enqueue([files()[0], files()[0]], null);
    expect(batch.items).toHaveLength(2);
    expect(new Set(batch.items.map((item) => item.id)).size).toBe(2);
    await batch.run();
    expect(batch.items.every((item) => item.state.phase === "done")).toBe(true);
    batch.clearCompleted();
    expect(batch.items).toHaveLength(0);
  });
});

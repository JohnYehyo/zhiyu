import { expect, it } from "vitest";
import {
  createUpload,
  completeUpload,
  type UploadRepository,
  type ObjectStorage,
} from "./upload-service";
import type { MediaRecord } from "../types";
const owner = "11111111-1111-4111-8111-111111111111";
function fixture() {
  let record: (MediaRecord & { ownerId: string }) | null = null;
  let head = { contentType: "image/jpeg", size: 100 };
  const repository: UploadRepository = {
    async create(value) {
      record = value;
      return value;
    },
    async get() {
      return record;
    },
    async ready() {
      if (!record) throw Error();
      record.status = "ready";
      return record;
    },
  };
  const storage: ObjectStorage = {
    async sign(key, type, size) {
      if (
        !key.startsWith(`blob/${owner}/`) ||
        type !== "image/jpeg" ||
        size !== 100
      )
        throw Error("bad signing input");
      return "https://upload.test/signed";
    },
    async head() {
      return head;
    },
  };
  return {
    repository,
    storage,
    get: () => record,
    setHead: (value: typeof head) => {
      head = value;
    },
  };
}
it("server issues an unguessable owner key, persists pending record, and completion requires matching HEAD", async () => {
  const f = fixture();
  const result = await createUpload(
    owner,
    { filename: "my photo.jpg", contentType: "image/jpeg", size: 100 },
    f.repository,
    f.storage,
  );
  expect(result.media.storageKey).toMatch(
    /^blob\/11111111-1111-4111-8111-111111111111\/[\da-f-]{36}\.jpg$/,
  );
  expect(result.media.status).toBe("pending");
  expect(result.uploadHeaders).toEqual({
    "Content-Type": "image/jpeg",
    "If-None-Match": "*",
  });
  f.setHead({ contentType: "image/png", size: 100 });
  await expect(
    completeUpload(owner, result.media.id, f.repository, f.storage),
  ).rejects.toThrow(/不一致/);
  expect(f.get()?.status).toBe("pending");
  f.setHead({ contentType: "image/jpeg", size: 99 });
  await expect(
    completeUpload(owner, result.media.id, f.repository, f.storage),
  ).rejects.toThrow(/不一致/);
  f.setHead({ contentType: "image/jpeg", size: 100 });
  const completed = await completeUpload(
    owner,
    result.media.id,
    f.repository,
    f.storage,
  );
  expect(completed.status).toBe("ready");
});
it("foreign media completion rejects before checking storage", async () => {
  const f = fixture();
  const result = await createUpload(
    owner,
    { filename: "x.jpg", contentType: "image/jpeg", size: 100 },
    f.repository,
    f.storage,
  );
  await expect(
    completeUpload("other", result.media.id, f.repository, f.storage),
  ).rejects.toThrow(/不存在/);
  expect(f.get()?.status).toBe("pending");
});
it("missing object never changes media to ready", async () => {
  const f = fixture();
  const result = await createUpload(
    owner,
    { filename: "x.jpg", contentType: "image/jpeg", size: 100 },
    f.repository,
    f.storage,
  );
  f.storage.head = async () => null;
  await expect(
    completeUpload(owner, result.media.id, f.repository, f.storage),
  ).rejects.toThrow(/未完成/);
  expect(f.get()?.status).toBe("pending");
});

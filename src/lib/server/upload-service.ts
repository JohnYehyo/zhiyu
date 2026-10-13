import { randomUUID } from "node:crypto";
import type { MediaRecord } from "../types";
import { ServiceError } from "./errors";
import { validateId, validateUpload } from "./security";
export interface UploadRepository {
  create(media: MediaRecord & { ownerId: string }): Promise<MediaRecord>;
  get(id: string): Promise<(MediaRecord & { ownerId: string }) | null>;
  ready(id: string, owner: string): Promise<MediaRecord>;
}
export interface ObjectStorage {
  sign(key: string, type: string, size: number): Promise<string>;
  head(key: string): Promise<{ contentType: string; size: number } | null>;
}
const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};
export async function createUpload(
  owner: string,
  input: { filename: string; contentType: string; size: number },
  repository: UploadRepository,
  storage: ObjectStorage,
): Promise<{
  media: MediaRecord;
  uploadUrl: string;
  uploadHeaders: { "Content-Type": string; "If-None-Match": "*" };
}> {
  validateId(owner);
  const upload = validateUpload(input);
  const id = randomUUID();
  const storageKey = `blob/${owner}/${id}.${extensions[upload.contentType]}`;
  const uploadUrl = await storage.sign(
    storageKey,
    upload.contentType,
    upload.size,
  );
  const media = await repository.create({
    id,
    ownerId: owner,
    storageKey,
    mimeType: upload.contentType,
    size: upload.size,
    status: "pending",
    filename: upload.filename,
  });
  return {
    media,
    uploadUrl,
    uploadHeaders: { "Content-Type": upload.contentType, "If-None-Match": "*" },
  };
}
export async function completeUpload(
  owner: string,
  id: string,
  repository: UploadRepository,
  storage: ObjectStorage,
): Promise<MediaRecord> {
  validateId(id);
  const media = await repository.get(id);
  if (!media || media.ownerId !== owner)
    throw new ServiceError(404, "NOT_FOUND", "媒体不存在。");
  const object = await storage.head(media.storageKey);
  if (!object)
    throw new ServiceError(409, "UPLOAD_INCOMPLETE", "媒体上传未完成。");
  if (object.contentType !== media.mimeType || object.size !== media.size)
    throw new ServiceError(
      409,
      "UPLOAD_MISMATCH",
      "媒体类型或大小不一致，请重新上传。",
    );
  return repository.ready(id, owner);
}

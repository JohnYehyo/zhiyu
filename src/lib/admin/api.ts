import type { DraftPost, MediaRecord } from "../types";
import type { SaveTransport } from "./save-coordinator";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

export async function adminRequest<T>(
  url: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const value = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ApiError(
      value.error || "请求失败，请稍后重试。",
      response.status,
      value.code,
    );
  return value as T;
}

async function requestPost(url: string, method: string, body: unknown) {
  return (await adminRequest<{ post: DraftPost }>(url, method, body)).post;
}

export const postTransport: SaveTransport = {
  create: (draft) => requestPost("/api/admin/posts", "POST", draft),
  save: (id, revision, draft) =>
    requestPost(`/api/admin/posts/${id}`, "PATCH", { revision, draft }),
  publish: (id, revision) =>
    requestPost(`/api/admin/posts/${id}/publish`, "POST", { revision }),
  unpublish: (id, revision) =>
    requestPost(`/api/admin/posts/${id}/unpublish`, "POST", { revision }),
};

export interface PendingUpload {
  media: MediaRecord;
  uploadUrl: string;
  uploadHeaders: { "Content-Type": string; "If-None-Match": "*" };
}

const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const videoTypes = ["video/mp4", "video/webm", "video/quicktime"];

export function validateUpload(
  file: Pick<File, "type" | "size">,
  kind: "image" | "video",
) {
  const types = kind === "image" ? imageTypes : videoTypes;
  const max = (kind === "image" ? 20 : 200) * 1024 * 1024;
  if (!types.includes(file.type))
    throw new Error(
      kind === "image"
        ? "请选择 JPEG、PNG、WebP 或 GIF 图片。"
        : "请选择 MP4、WebM 或 QuickTime 视频。",
    );
  if (file.size <= 0 || file.size > max)
    throw new Error(
      `文件大小须为 1 字节至 ${kind === "image" ? 20 : 200} MiB。`,
    );
}

export function putFile(
  file: File,
  pending: PendingUpload,
  progress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", pending.uploadUrl);
    for (const [name, value] of Object.entries(pending.uploadHeaders))
      xhr.setRequestHeader(name, value);
    xhr.timeout = 10 * 60 * 1000;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        progress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error("直传未确认成功，请尝试确认上传结果。"));
    xhr.onerror = xhr.ontimeout = () =>
      reject(new Error("上传连接中断，可先重试确认结果。"));
    xhr.send(file);
  });
}

export function completeUpload(id: string) {
  return adminRequest<{ media: MediaRecord; url: string }>(
    `/api/admin/media/${id}/complete`,
    "POST",
  );
}

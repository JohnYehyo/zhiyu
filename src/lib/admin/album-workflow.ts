import type { AlbumDraft, AlbumPhoto } from "../album-types";
import type { MediaRecord } from "../types";
import { ApiError, validateUpload, type PendingUpload } from "./api";

export interface AlbumUploadTransport {
  sign(file: File): Promise<PendingUpload>;
  put(file: File, pending: PendingUpload, progress: (percent: number) => void): Promise<void>;
  confirm(id: string): Promise<MediaRecord>;
  create(input: AlbumDraft & { mediaId: string }): Promise<AlbumPhoto>;
}
export interface AlbumAdditionState {
  phase: "idle" | "uploading" | "confirming" | "adding" | "pending" | "ready" | "done" | "duplicate" | "error";
  percent: number;
  pending?: PendingUpload;
  media?: MediaRecord;
  error?: string;
}
export class AlbumAddition {
  state: AlbumAdditionState = { phase: "idle", percent: 0 };
  private busy = false;
  private file?: File;
  private collectionId?: string | null;
  private signedAt = 0;
  constructor(private transport: AlbumUploadTransport, private notify: (state: AlbumAdditionState) => void) {}
  private update(state: AlbumAdditionState) {
    this.state = state;
    this.notify(state);
  }
  reset() {
    if (!this.busy) { this.file = undefined; this.collectionId = undefined; this.update({ phase: "idle", percent: 0 }); }
  }
  private async run(operation: () => Promise<AlbumPhoto>): Promise<AlbumPhoto | null> {
    if (this.busy) return null;
    this.busy = true;
    try {
      const photo = await operation();
      this.update({ phase: "done", percent: 100 });
      return photo;
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "ALBUM_DUPLICATE") {
        this.update({ phase: "duplicate", percent: 0, error: albumErrorMessage(cause) });
      } else {
        this.update({
          ...this.state,
          phase: this.state.media ? "ready" : this.state.pending ? "pending" : "error",
          error: albumErrorMessage(cause),
        });
      }
      return null;
    } finally {
      this.busy = false;
    }
  }
  async upload(file: File, collectionId?: string | null): Promise<AlbumPhoto | null> {
    return this.run(async () => {
      this.file = file;
      this.collectionId = collectionId;
      return this.uploadFile(file);
    });
  }
  async retry(): Promise<AlbumPhoto | null> {
    if (this.state.phase === "done" || this.state.phase === "duplicate") return null;
    return this.run(async () => {
      if (this.state.media) return this.create(this.state.media);
      if (this.state.pending) {
        const pending = this.state.pending;
        try { return await this.confirmAndCreate(pending); }
        catch (cause) {
          // Only a definitive missing-object response permits another PUT.
          if (!(cause instanceof ApiError) || cause.code !== "UPLOAD_INCOMPLETE" || !this.file) throw cause;
          if (Date.now() - this.signedAt >= 290_000) return this.uploadFile(this.file);
          return this.putAndCreate(this.file, pending);
        }
      }
      if (this.file) return this.uploadFile(this.file);
      throw new Error("请重新选择图片。");
    });
  }
  async select(media: MediaRecord, collectionId?: string | null): Promise<AlbumPhoto | null> {
    return this.run(async () => {
      this.file = undefined;
      this.collectionId = collectionId;
      // Clear previous recovery identities before accepting a new choice.
      this.update({ phase: "idle", percent: 0 });
      return this.create(media);
    });
  }
  private async uploadFile(file: File) {
    this.update({ phase: "uploading", percent: 0 });
    validateUpload(file, "image");
    const pending = await this.transport.sign(file);
    this.signedAt = Date.now();
    return this.putAndCreate(file, pending);
  }
  private async putAndCreate(file: File, pending: PendingUpload) {
    this.update({ phase: "uploading", percent: 0, pending });
    await this.transport.put(file, pending, (percent) => this.update({ phase: "uploading", percent, pending }));
    return this.confirmAndCreate(pending);
  }
  private async confirmAndCreate(pending: PendingUpload) {
    this.update({ phase: "confirming", percent: 100, pending });
    const media = await this.transport.confirm(pending.media.id);
    if (media.id !== pending.media.id) throw new Error("上传确认结果不匹配，请重试确认。");
    return this.create(media);
  }
  private async create(media: MediaRecord) {
    if (media.status !== "ready" || !media.mimeType.startsWith("image/"))
      throw new Error("请选择已完成上传的图片。");
    this.update({ phase: "adding", percent: 100, media });
    return this.transport.create({ mediaId: media.id, caption: "", alt: "", date: "", ...(this.collectionId !== undefined ? { collectionId: this.collectionId } : {}) });
  }
}
export function albumUpdatePayload(photo: AlbumPhoto, draft: AlbumDraft, published: boolean) {
  return { revision: photo.revision, caption: draft.caption, alt: draft.alt, date: draft.date, ...(draft.collectionId !== undefined ? { collectionId: draft.collectionId } : {}), published };
}

export function albumErrorMessage(cause: unknown) {
  const message = cause instanceof Error ? cause.message : "操作失败，请稍后重试。";
  return cause instanceof ApiError && cause.status === 429
    ? `${message} 请稍等片刻后重试。`
    : message;
}

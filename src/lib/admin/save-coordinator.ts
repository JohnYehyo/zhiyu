import type { DraftPost, PostDraft } from "../types";
export interface SaveTransport {
  create(draft: PostDraft): Promise<DraftPost>;
  save(id: string, revision: number, draft: PostDraft): Promise<DraftPost>;
  publish(id: string, revision: number): Promise<DraftPost>;
  unpublish(id: string, revision: number): Promise<DraftPost>;
}
export type SaveStatus =
  | "dirty"
  | "saving"
  | "saved"
  | "publishing"
  | "error"
  | "conflict";
export interface SaveSnapshot {
  draft: PostDraft;
  post: DraftPost | null;
  status: SaveStatus;
  error: string | null;
  dirty: boolean;
}

/** One writer per editor. Server responses update revision, never replace local text. */
export class SaveCoordinator {
  private draft: PostDraft;
  private post: DraftPost | null;
  private version = 0;
  private savedVersion: number;
  private status: SaveStatus;
  private error: string | null = null;
  private conflict = false;
  private tail: Promise<unknown> = Promise.resolve();
  private listeners = new Set<() => void>();

  constructor(
    draft: PostDraft,
    post: DraftPost | null,
    private transport: SaveTransport,
  ) {
    this.draft = structuredClone(draft);
    this.post = post;
    this.savedVersion = post ? 0 : -1;
    this.status = post ? "saved" : "dirty";
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }

  update(draft: PostDraft) {
    this.draft = structuredClone(draft);
    this.version++;
    if (!this.conflict && !["saving", "publishing"].includes(this.status))
      this.status = "dirty";
    if (!this.conflict) this.error = null;
    this.emit();
  }

  snapshot(): SaveSnapshot {
    return {
      draft: this.draft,
      post: this.post,
      status: this.status,
      error: this.error,
      dirty: this.version !== this.savedVersion,
    };
  }

  private enqueue(operation: () => Promise<void>) {
    const task = this.tail.then(operation);
    this.tail = task.catch(() => undefined);
    return task;
  }

  private fail(error: unknown, version: number) {
    this.conflict =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      error.status === 409;
    if (this.conflict || version === this.version) {
      this.status = this.conflict ? "conflict" : "error";
      this.error =
        error instanceof Error ? error.message : "保存失败，请重试。";
    } else {
      this.status = "dirty";
      this.error = null;
    }
    this.emit();
  }

  private async saveLatest() {
    if (this.conflict)
      throw new Error("版本冲突：本地内容已保留，请下载后重新打开稿件。");
    while (this.savedVersion !== this.version) {
      const version = this.version;
      const draft = structuredClone(this.draft);
      this.status = "saving";
      this.error = null;
      this.emit();
      try {
        this.post = this.post
          ? await this.transport.save(this.post.id, this.post.revision, draft)
          : await this.transport.create(draft);
        this.savedVersion = version;
      } catch (error) {
        this.fail(error, version);
        throw error;
      }
    }
    this.status = "saved";
    this.emit();
  }

  flush() {
    return this.enqueue(() => this.saveLatest());
  }

  private changePublication(action: "publish" | "unpublish") {
    return this.enqueue(async () => {
      await this.saveLatest();
      const version = this.version;
      this.status = "publishing";
      this.emit();
      try {
        this.post = await this.transport[action](
          this.post!.id,
          this.post!.revision,
        );
        this.status = version === this.version ? "saved" : "dirty";
        this.emit();
      } catch (error) {
        this.fail(error, version);
        throw error;
      }
    });
  }

  publish() {
    return this.changePublication("publish");
  }
  unpublish() {
    return this.changePublication("unpublish");
  }
}

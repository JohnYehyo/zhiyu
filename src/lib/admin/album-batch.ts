import type { AlbumPhoto } from "../album-types";
import { AlbumAddition, type AlbumAdditionState, type AlbumUploadTransport } from "./album-workflow";

export interface AlbumBatchItem {
  id: number;
  name: string;
  collectionId: string | null;
  state: AlbumAdditionState;
  photo?: AlbumPhoto;
}
interface QueueEntry extends AlbumBatchItem { file: File; workflow: AlbumAddition }
const terminal = (state: AlbumAdditionState) => state.phase === "done" || state.phase === "duplicate";

/** Sequential uploads keep each file's recovery identity and don't abort later files. */
export class AlbumBatch {
  private entries: QueueEntry[] = [];
  private nextId = 0;
  busy = false;
  constructor(private transport: AlbumUploadTransport, private notify: () => void, private added?: (photo: AlbumPhoto) => void) {}
  get items(): AlbumBatchItem[] { return this.entries.map(({ id, name, collectionId, state, photo }) => ({ id, name, collectionId, state, photo })); }
  get hasPending() { return this.entries.some((entry) => !terminal(entry.state)); }
  enqueue(files: File[], collectionId: string | null) {
    if (this.busy) return;
    for (const file of files) {
      if (this.entries.some((entry) => entry.file === file)) continue;
      const entry: QueueEntry = {
        id: ++this.nextId, name: file.name, file, collectionId, state: { phase: "idle", percent: 0 },
        workflow: new AlbumAddition(this.transport, (state) => { entry.state = state; this.notify(); }),
      };
      this.entries.push(entry);
    }
    this.notify();
  }
  async run() { await this.process(false); }
  async retryFailed(id?: number) { await this.process(true, id); }
  private async process(retry: boolean, id?: number) {
    if (this.busy) return;
    this.busy = true; this.notify();
    try {
      for (const entry of this.entries) {
        if (terminal(entry.state) || (id !== undefined && entry.id !== id)) continue;
        if (retry ? entry.state.phase === "idle" : entry.state.phase !== "idle") continue;
        const photo = await (retry ? entry.workflow.retry() : entry.workflow.upload(entry.file, entry.collectionId));
        if (photo) { entry.photo = photo; this.added?.(photo); }
      }
    } finally { this.busy = false; this.notify(); }
  }
  clearCompleted() { if (!this.busy) { this.entries = this.entries.filter((entry) => !terminal(entry.state)); this.notify(); } }
  remove(id: number) { if (!this.busy) { this.entries = this.entries.filter((entry) => entry.id !== id); this.notify(); } }
}

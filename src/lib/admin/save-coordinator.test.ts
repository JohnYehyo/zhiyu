import { describe, expect, it } from "vitest";
import type { DraftPost, PostDraft } from "../types";
import { SaveCoordinator, type SaveTransport } from "./save-coordinator";

const draft = (title: string): PostDraft => ({
  title,
  slug: "a-day",
  excerpt: "",
  category: "日常",
  coverKey: "",
  content: {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: title }] }],
  },
});
const post = (title: string, revision: number): DraftPost => ({
  id: "post-id",
  revision,
  draft: draft(title),
  publishedAt: null,
  publishedRevision: null,
  updatedAt: "2026-10-12",
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe("save queue", () => {
  it("uses the acknowledged revision and saves newer typing after an in-flight save", async () => {
    const first = deferred<DraftPost>();
    const requests: { revision: number; title: string }[] = [];
    const transport: SaveTransport = {
      create: async () => post("unused", 1),
      save: async (_id, revision, value) => {
        requests.push({ revision, title: value.title });
        return requests.length === 1
          ? first.promise
          : post(value.title, revision + 1);
      },
      publish: async () => post("latest", 3),
      unpublish: async () => post("latest", 3),
    };
    const queue = new SaveCoordinator(draft("old"), post("old", 1), transport);
    queue.update(draft("first"));
    const save = queue.flush();
    await Promise.resolve();
    queue.update(draft("latest"));
    first.resolve(post("first", 2));
    await save;
    expect(requests).toEqual([
      { revision: 1, title: "first" },
      { revision: 2, title: "latest" },
    ]);
    expect(queue.snapshot()).toMatchObject({
      draft: { title: "latest" },
      status: "saved",
      post: { revision: 3 },
    });
  });

  it("never resets newer text when initial creation resolves", async () => {
    const creating = deferred<DraftPost>();
    const queue = new SaveCoordinator(draft("first"), null, {
      create: () => creating.promise,
      save: async (_id, revision, value) => post(value.title, revision + 1),
      publish: async () => post("latest", 2),
      unpublish: async () => post("latest", 2),
    });
    const save = queue.flush();
    await Promise.resolve();
    queue.update(draft("latest"));
    creating.resolve(post("first", 1));
    await save;
    expect(queue.snapshot()).toMatchObject({
      draft: { title: "latest" },
      post: { revision: 2 },
      status: "saved",
    });
  });

  it("stops after conflict and retains local text even after further edits", async () => {
    let attempts = 0;
    const queue = new SaveCoordinator(draft("old"), post("old", 1), {
      create: async () => post("unused", 1),
      save: async () => {
        attempts++;
        throw Object.assign(new Error("conflict"), {
          status: 409,
          code: "REVISION_CONFLICT",
        });
      },
      publish: async () => post("unused", 1),
      unpublish: async () => post("unused", 1),
    });
    queue.update(draft("my text"));
    await expect(queue.flush()).rejects.toThrow("conflict");
    queue.update(draft("retained"));
    await expect(queue.flush()).rejects.toThrow();
    expect(attempts).toBe(1);
    expect(queue.snapshot()).toMatchObject({
      draft: { title: "retained" },
      status: "conflict",
    });
  });

  it("does not attach an old request error to newer text", async () => {
    const failed = deferred<DraftPost>();
    const queue = new SaveCoordinator(draft("old"), post("old", 1), {
      create: async () => post("unused", 1),
      save: () => failed.promise,
      publish: async () => post("unused", 1),
      unpublish: async () => post("unused", 1),
    });
    queue.update(draft("first"));
    const save = queue.flush();
    await Promise.resolve();
    queue.update(draft("newer"));
    failed.reject(new Error("old network error"));
    await expect(save).rejects.toThrow("old network error");
    expect(queue.snapshot()).toMatchObject({
      draft: { title: "newer" },
      status: "dirty",
      error: null,
    });
  });

  it("publishes only after the latest queued edit is acknowledged", async () => {
    const saving = deferred<DraftPost>();
    const events: string[] = [];
    const queue = new SaveCoordinator(draft("old"), post("old", 4), {
      create: async () => post("unused", 1),
      save: async (_id, revision, value) => {
        events.push(`save:${revision}:${value.title}`);
        return revision === 4
          ? saving.promise
          : post(value.title, revision + 1);
      },
      publish: async (_id, revision) => {
        events.push(`publish:${revision}`);
        return { ...post("newest", revision), publishedRevision: revision };
      },
      unpublish: async () => post("unused", 1),
    });
    queue.update(draft("first"));
    const publishing = queue.publish();
    await Promise.resolve();
    queue.update(draft("newest"));
    saving.resolve(post("first", 5));
    await publishing;
    expect(events).toEqual(["save:4:first", "save:5:newest", "publish:6"]);
    expect(queue.snapshot().post?.publishedRevision).toBe(6);
  });

  it("recovers from a slug collision after editing the address and saving", async () => {
    const events: string[] = [];
    const queue = new SaveCoordinator(draft("text"), post("text", 1), {
      create: async () => post("text", 1),
      save: async (_id, revision, value) => {
        events.push(`save:${value.slug}`);
        return { ...post(value.title, revision + 1), draft: value };
      },
      publish: async (_id, revision) => {
        events.push(`publish:${revision}`);
        if (revision === 1)
          throw Object.assign(new Error("address taken"), {
            status: 409,
            code: "SLUG_CONFLICT",
          });
        return {
          ...post("text", revision),
          draft: { ...draft("text"), slug: "my-unique-day" },
          publishedRevision: revision,
          publishedAt: "2026-10-12",
        };
      },
      unpublish: async () => post("text", 1),
    });
    await expect(queue.publish()).rejects.toThrow("address taken");
    expect(queue.snapshot().status).toBe("error");
    queue.update({ ...draft("text"), slug: "my-unique-day" });
    await queue.flush();
    await queue.publish();
    expect(events).toEqual(["publish:1", "save:my-unique-day", "publish:2"]);
    expect(queue.snapshot()).toMatchObject({
      status: "saved",
      post: { publishedRevision: 2 },
    });
  });

  it("allows media state errors to be corrected and republished", async () => {
    let ready = false;
    let publications = 0;
    const queue = new SaveCoordinator(draft("text"), post("text", 1), {
      create: async () => post("text", 1),
      save: async (_id, revision, value) => ({
        ...post(value.title, revision + 1),
        draft: value,
      }),
      publish: async (_id, revision) => {
        publications++;
        if (!ready)
          throw Object.assign(new Error("media pending"), {
            status: 409,
            code: "MEDIA_NOT_READY",
          });
        return {
          ...post("corrected", revision),
          publishedRevision: revision,
          publishedAt: "2026-10-12",
        };
      },
      unpublish: async () => post("text", 1),
    });
    await expect(queue.publish()).rejects.toThrow("media pending");
    expect(queue.snapshot().status).toBe("error");
    queue.update(draft("corrected"));
    ready = true;
    await queue.publish();
    expect(publications).toBe(2);
    expect(queue.snapshot()).toMatchObject({
      status: "saved",
      post: { revision: 2, publishedRevision: 2 },
    });
  });

  it("tracks real unsaved changes relative to the initial content and latest acknowledgement", async () => {
    const queue = new SaveCoordinator(draft("original"), null, {
      create: async (value) => ({ ...post(value.title, 1), draft: value }),
      save: async (_id, revision, value) => ({
        ...post(value.title, revision + 1),
        draft: value,
      }),
      publish: async () => post("unused", 1),
      unpublish: async () => post("unused", 1),
    });
    expect(queue.snapshot()).toMatchObject({
      dirty: true,
      hasUnsavedChanges: false,
    });
    queue.update(draft("edited"));
    expect(queue.snapshot().hasUnsavedChanges).toBe(true);
    queue.update(draft("original"));
    expect(queue.snapshot().hasUnsavedChanges).toBe(false);
    queue.update(draft("new text"));
    await queue.flush();
    expect(queue.snapshot()).toMatchObject({
      dirty: false,
      hasUnsavedChanges: false,
    });
    queue.update(draft("other"));
    expect(queue.snapshot().hasUnsavedChanges).toBe(true);
  });
});

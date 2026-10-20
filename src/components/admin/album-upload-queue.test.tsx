import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AlbumUploadQueue } from "./album-upload-queue";

it("shows every file, private completion, partial failure and per-file recovery controls", () => {
  const html = renderToStaticMarkup(<AlbumUploadQueue items={[
    { id: 1, name: "one.jpg", collectionId: "a", state: { phase: "done", percent: 100 } },
    { id: 2, name: "two.jpg", collectionId: "a", state: { phase: "pending", percent: 20, error: "上传连接中断" } },
    { id: 3, name: "three.jpg", collectionId: "a", state: { phase: "uploading", percent: 40 } },
  ]} busy={false} onRetry={() => {}} onRemove={() => {}} onClear={() => {}} />);
  expect(html).toContain("已加入 1 / 3 张");
  expect(html).toContain("已加入 · 未公开");
  expect(html).toContain("one.jpg"); expect(html).toContain("two.jpg"); expect(html).toContain("three.jpg");
  expect(html).toContain("重试失败项");
  expect(html).toContain('aria-label="重试 two.jpg"');
  expect(html).not.toContain('aria-label="重试 one.jpg"');
  expect(html).toContain('value="40"');
  expect(html).toContain("上传连接中断");
});
it("disables recovery and removal while the queue is processing", () => {
  const html = renderToStaticMarkup(<AlbumUploadQueue items={[{ id: 1, name: "failed.jpg", collectionId: null, state: { phase: "error", percent: 0, error: "offline" } }]} busy onRetry={() => {}} onRemove={() => {}} onClear={() => {}} />);
  expect(html).toContain("正在处理");
  expect(html).toMatch(/disabled=""[^>]*aria-label="重试 failed.jpg"/);
  expect(html).toMatch(/disabled=""[^>]*aria-label="移除队列文件 failed.jpg"/);
});

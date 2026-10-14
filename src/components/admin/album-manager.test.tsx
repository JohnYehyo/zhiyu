import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AlbumManager } from "./album-manager";

it("offers independent image upload or material reuse and waits for private album data without showing journal placeholders", () => {
  const html = renderToStaticMarkup(<AlbumManager />);
  expect(html).toContain("上传照片");
  expect(html).toContain("从素材添加");
  expect(html).toContain('accept="image/jpeg,image/png,image/webp,image/gif"');
  expect(html).toContain("正在读取相册");
  expect(html).not.toContain("写一篇日记");
  expect(html).not.toContain('<img');
  expect(html).not.toContain("公开照片");
});

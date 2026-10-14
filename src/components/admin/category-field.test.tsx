import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { CategoryField } from "./category-field";

it("offers discoverable category choices while keeping a custom category editable", () => {
  const html = renderToStaticMarkup(
    <CategoryField value="自己的分类" onChange={() => {}} demo />,
  );
  expect(html).toContain("<select");
  expect(html).toContain("日常碎片");
  expect(html).toContain("慢慢长大");
  expect(html).toContain("出去走走");
  expect(html).toContain('value="自己的分类"');
  expect(html).toContain('maxLength="60"');
});

it("category field safely renders custom text and supports the editor's disabled state", () => {
  const html = renderToStaticMarkup(
    <CategoryField value={'<script>alert("category")</script>'} onChange={() => {}} disabled />,
  );
  expect(html).not.toContain("<script>");
  expect(html).toContain("&lt;script&gt;");
  expect(html).toMatch(/<select[^>]*disabled=""/);
  expect(html).toMatch(/<input[^>]*disabled=""/);
});

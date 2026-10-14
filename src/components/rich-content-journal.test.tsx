import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RichContent } from "./rich-content";

it("renders journal notes and polaroid photo pairs without interpreting captions as HTML", () => {
  const html = renderToStaticMarkup(
    <RichContent
      document={{
        type: "doc",
        content: [
          {
            type: "blockquote",
            attrs: { tone: "blue", attribution: "<script>signature</script>" },
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "今天很好" }],
              },
            ],
          },
          {
            type: "image",
            attrs: {
              storageKey: "/assets/picnic.svg",
              caption: "午后",
              date: "May, 2026",
              layout: "pair",
            },
          },
          {
            type: "image",
            attrs: {
              storageKey: "/assets/flowers.svg",
              caption: "小花",
              layout: "pair",
            },
          },
        ],
      }}
    />,
  );
  expect(html).toContain('data-tone="blue"');
  expect(html).toContain("&lt;script&gt;signature&lt;/script&gt;");
  expect(html).toContain("content-photo-pair");
  expect(html).toContain("photo-date");
  expect(html.match(/class="content-image/g)).toHaveLength(2);
  expect(html).not.toContain("<script>");
});

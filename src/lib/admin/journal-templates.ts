import type { RichNode } from "../types";

export type JournalTemplate = "journal" | "note" | "photos";
const paragraph = (text: string): RichNode => ({
  type: "paragraph",
  content: text ? [{ type: "text", text }] : [],
});
const heading = (text: string): RichNode => ({
  type: "heading",
  attrs: { level: 2 },
  content: [{ type: "text", text }],
});

/** Each call returns new editable nodes, never HTML or unfinished cloud media. */
export function journalTemplate(kind: JournalTemplate): RichNode {
  const note: RichNode = {
    type: "blockquote",
    attrs: { tone: "pink", attribution: "记在今天的小日记里" },
    content: [
      paragraph("今天没有做什么了不起的事，"),
      paragraph("但我们度过了一个很好的下午。"),
    ],
  };
  const photos: RichNode[] = [
    {
      type: "image",
      attrs: {
        storageKey: "/assets/meadow.svg",
        alt: "青草地上的小小风景",
        caption: "走到哪里，就把快乐留在哪里。",
        layout: "pair",
        date: "",
      },
    },
    {
      type: "image",
      attrs: {
        storageKey: "/assets/flowers.svg",
        alt: "一束小花",
        caption: "收藏今天的小美好。",
        layout: "pair",
        date: "",
      },
    },
  ];
  return {
    type: "doc",
    content:
      kind === "note"
        ? [note, paragraph("")]
        : kind === "photos"
          ? [...photos, paragraph("")]
          : [
              heading("今天的小日记"),
              paragraph(
                "从这里开始写今天的故事。每一段文字都可以直接修改，照片也可以替换成自己的。",
              ),
              note,
              heading("两张小留影"),
              ...photos,
              heading("写在最后"),
              paragraph(
                "想留给未来的你，一句话、一个愿望，或者一个普通的好日子。",
              ),
            ],
  };
}

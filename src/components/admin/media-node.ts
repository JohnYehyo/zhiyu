import { Node } from "@tiptap/core";
import { mediaUrl } from "@/lib/media";

function mediaNode(kind: "image" | "video") {
  return Node.create({
    name: kind,
    group: "block",
    atom: true,
    draggable: true,
    addAttributes() {
      const attrs = Object.fromEntries(
        ["mediaId", "storageKey", "src", "alt", "caption"].map((name) => [
          name,
          { default: "", rendered: false },
        ]),
      );
      return kind === "image"
        ? {
            ...attrs,
            layout: { default: "single", rendered: false },
            date: { default: "", rendered: false },
          }
        : attrs;
    },
    // Pasted arbitrary URLs are not ready server-verified media.
    parseHTML() {
      return [];
    },
    renderHTML({ node }) {
      const src = mediaUrl(node.attrs.storageKey);
      const media =
        kind === "image"
          ? ["img", { src, alt: node.attrs.alt }]
          : [
              "video",
              {
                src,
                controls: "",
                playsinline: "",
                preload: "metadata",
                "aria-label": node.attrs.alt || "视频",
              },
            ];
      return [
        "figure",
        {
          class: `editor-media editor-${kind}`,
          "data-media-id": node.attrs.mediaId,
          ...(kind === "image" ? { "data-layout": node.attrs.layout } : {}),
        },
        media,
        [
          "figcaption",
          {},
          node.attrs.caption ||
            (kind === "image"
              ? "点击照片，编辑图注或替换图片"
              : "点击视频，编辑说明"),
          ...(kind === "image" && node.attrs.date
            ? [["span", { class: "photo-date" }, node.attrs.date]]
            : []),
        ],
      ];
    },
  });
}

export const EditorImage = mediaNode("image");
export const EditorVideo = mediaNode("video");

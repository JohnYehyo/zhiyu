import { Node } from "@tiptap/core";
import { mediaUrl } from "@/lib/media";

function mediaNode(kind: "image" | "video") {
  return Node.create({
    name: kind,
    group: "block",
    atom: true,
    draggable: true,
    addAttributes() {
      return Object.fromEntries(
        ["mediaId", "storageKey", "src", "alt", "caption"].map((name) => [
          name,
          { default: "", rendered: false },
        ]),
      );
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
        },
        media,
        ["figcaption", {}, node.attrs.caption || "点击媒体，编辑说明与图注"],
      ];
    },
  });
}

export const EditorImage = mediaNode("image");
export const EditorVideo = mediaNode("video");

import { Extension } from "@tiptap/core";

export const JournalStyle = Extension.create({
  name: "journalStyle",
  addGlobalAttributes() {
    return [
      {
        types: ["blockquote"],
        attributes: {
          tone: {
            default: "pink",
            parseHTML: (element) => element.getAttribute("data-tone") ?? "pink",
            renderHTML: (attrs) => ({ "data-tone": attrs.tone }),
          },
          attribution: {
            default: "",
            parseHTML: (element) =>
              element.getAttribute("data-attribution") ?? "",
            renderHTML: (attrs) => ({ "data-attribution": attrs.attribution }),
          },
        },
      },
    ];
  },
});

/** Bundled, reviewed illustrations that may be used without an uploaded media record. */
export const journalAssets = [
  { key: "/assets/picnic.svg", label: "野餐" },
  { key: "/assets/meadow.svg", label: "草地" },
  { key: "/assets/flowers.svg", label: "鲜花" },
  { key: "/assets/sea.svg", label: "海边" },
  { key: "/assets/window.svg", label: "窗边" },
  { key: "/assets/sun.svg", label: "阳光" },
] as const;

export function isJournalAsset(key: unknown): key is (typeof journalAssets)[number]["key"] {
  return typeof key === "string" && journalAssets.some((asset) => asset.key === key);
}

export const journalQuoteTones = ["pink", "blue", "green", "yellow", "peach", "mint"] as const;

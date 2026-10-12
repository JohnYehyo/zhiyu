export interface RichNode {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: RichNode[];
}

export interface PostDraft {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  coverKey: string;
  content: RichNode;
}

export interface Article extends PostDraft {
  id: string;
  publishedAt: string;
  demo?: boolean;
}

export interface DraftPost {
  id: string;
  revision: number;
  draft: PostDraft;
  publishedRevision: number | null;
  publishedAt: string | null;
  updatedAt: string;
}

export interface MediaRecord {
  id: string;
  storageKey: string;
  mimeType: string;
  size: number;
  status: "pending" | "ready";
  alt?: string;
}

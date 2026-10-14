export interface AlbumDraft {
  caption: string;
  alt: string;
  date: string;
}
export interface AlbumPhoto extends AlbumDraft {
  id: string;
  mediaId: string;
  storageKey: string;
  revision: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface PublicAlbumPhoto extends AlbumDraft {
  id: string;
  storageKey: string;
  publishedAt: string;
  demo?: boolean;
}

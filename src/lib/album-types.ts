export interface AlbumDraft {
  caption: string;
  alt: string;
  date: string;
  collectionId?: string | null;
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

export interface AlbumCollection {
  id: string;
  title: string;
  description: string;
  revision: number;
  photoCount: number;
  createdAt: string;
  updatedAt: string;
}
export interface PublicAlbumCollection {
  id: string | null;
  title: string;
  description: string;
  photoCount: number;
  coverStorageKey: string | null;
}

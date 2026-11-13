import type { AlbumDraft, AlbumPhoto } from '../album-types';
export async function materializeAlbumPhoto(photo: AlbumPhoto, create: (input: AlbumDraft & {mediaId:string}) => Promise<AlbumPhoto>): Promise<AlbumPhoto> {
  if (!photo.mediaOnly) return photo;
  return create({mediaId:photo.mediaId,caption:photo.caption,alt:photo.alt,date:photo.date,collectionId:photo.collectionId ?? null});
}

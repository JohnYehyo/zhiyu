import type { AlbumPhoto } from '../album-types';

type BulkAction = 'delete' | 'publish' | 'unpublish';
export async function applyAlbumBulk(photos: AlbumPhoto[], action: BulkAction, transport: {
  remove(photo: AlbumPhoto): Promise<void>;
  update(photo: AlbumPhoto, published: boolean): Promise<void>;
}) {
  const failed: AlbumPhoto[] = [];
  for (const photo of photos) {
    try {
      if (action === 'delete') await transport.remove(photo);
      else await transport.update(photo, action === 'publish');
    } catch { failed.push(photo); }
  }
  return { succeeded: photos.length - failed.length, failed };
}

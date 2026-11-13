import { expect, it, vi } from 'vitest';
import { materializeAlbumPhoto } from './album-materialize';
import type { AlbumPhoto } from '../album-types';
const photo: AlbumPhoto = {id:'media-id',mediaId:'media-id',mediaOnly:true,storageKey:'key',caption:'',alt:'',date:'',collectionId:null,revision:0,published:false,createdAt:'',updatedAt:''};
it('creates an album record for a media-only image before editing it',async()=>{
 const create=vi.fn(async()=>({...photo,id:'album-id',revision:1,mediaOnly:false}));
 const result=await materializeAlbumPhoto(photo,create);
 expect(create).toHaveBeenCalledWith({mediaId:'media-id',caption:'',alt:'',date:'',collectionId:null});
 expect(result.id).toBe('album-id');
});
it('uses existing album records without creating duplicates',async()=>{
 const create=vi.fn();const existing={...photo,id:'album-id',mediaOnly:false,revision:1};
 expect(await materializeAlbumPhoto(existing,create)).toBe(existing);expect(create).not.toHaveBeenCalled();
});

import { expect, it, vi } from 'vitest';
import { applyAlbumBulk } from './album-bulk-actions';
import type { AlbumPhoto } from '../album-types';
const photo = (id:string, published:boolean):AlbumPhoto => ({id,mediaId:id,storageKey:'',caption:id,alt:'',date:'',revision:1,published,createdAt:'',updatedAt:'',collectionId:null});
it('continues after a conflict and reports exactly which photos failed',async()=>{
 const update=vi.fn(async(p:AlbumPhoto)=>{if(p.id==='conflict') throw new Error('conflict')});
 const remove=vi.fn();
 const photos=[photo('first',false),photo('conflict',false),photo('last',true)];
 const result=await applyAlbumBulk(photos,'publish',{update,remove});
 expect(update.mock.calls.map(([p])=>p.id)).toEqual(['first','conflict','last']);
 expect(result.failed.map(p=>p.id)).toEqual(['conflict']);
 expect(result.succeeded).toBe(2);
 expect(result.errors).toEqual([{photo:photos[1],message:'conflict'}]);
});

import { expect, it, vi } from 'vitest';
import { deleteMedia } from './media-delete';
const owner='11111111-1111-4111-8111-111111111111',id='44444444-4444-4444-8444-444444444444';
it('does not finalize deletion when storage removal fails, allowing retry',async()=>{
 const begin=vi.fn(async()=>`blob/${owner}/${id}.jpg`), remove=vi.fn(async()=>{throw new Error('storage')});const finish=vi.fn(async()=>id);
 await expect(deleteMedia(owner,id,null,{begin,finish},{remove})).rejects.toThrow('storage');
 expect(finish).not.toHaveBeenCalled();
});
it('finishes only after storage confirms removal',async()=>{
 const order:string[]=[];const begin=async()=>{order.push('begin');return `blob/${owner}/${id}.jpg`};const remove=async()=>{order.push('remove')};const finish=async()=>{order.push('finish');return id};
 expect(await deleteMedia(owner,id,null,{begin,finish},{remove})).toBe(id);expect(order).toEqual(['begin','remove','finish']);
});
it('never deletes a key that does not belong to the selected owner and media id',async()=>{
 const remove=vi.fn(async()=>{}),finish=vi.fn(async()=>id);
 await expect(deleteMedia(owner,id,null,{begin:async()=>`blob/${owner}/99999999-9999-4999-8999-999999999999.jpg`,finish},{remove})).rejects.toThrow();
 expect(remove).not.toHaveBeenCalled();expect(finish).not.toHaveBeenCalled();
});

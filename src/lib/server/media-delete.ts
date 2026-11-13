import { validateId } from './security';
import { ServiceError } from './errors';
export async function deleteMedia(owner:string, id:string, revision:number|null, repository:{begin(owner:string,id:string,revision:number|null):Promise<string>;finish(owner:string,id:string):Promise<string>}, storage:{remove(key:string):Promise<void>}):Promise<string> {
  validateId(owner); validateId(id);
  const key = await repository.begin(owner,id,revision);
  const prefix = `blob/${owner.toLowerCase()}/${id.toLowerCase()}.`;
  if (!key.toLowerCase().startsWith(prefix) || !['jpg','png','webp','gif'].includes(key.slice(prefix.length).toLowerCase()))
    throw new ServiceError(409, 'MEDIA_KEY_INVALID', '图片存储地址不匹配，无法删除。');
  await storage.remove(key);
  const deleted = await repository.finish(owner,id);
  if (deleted !== id.toLowerCase()) throw new Error('删除结果未确认，请重试。');
  return deleted;
}

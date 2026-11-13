import { handleAdmin, readJson } from '@/lib/server/http';
import { getServiceSupabase } from '@/lib/supabase/service';
import { r2Storage } from '@/lib/server/r2';
import { deleteMedia } from '@/lib/server/media-delete';
import { ServiceError } from '@/lib/server/errors';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
function errorFor(error:{message:string;code?:string}):never {
  if(error.message.includes('ALBUM_CONFLICT')) throw new ServiceError(409,'ALBUM_CONFLICT','照片已变化，请刷新后重试。');
  if(error.message.includes('MEDIA_KEY_INVALID')) throw new ServiceError(409,'MEDIA_KEY_INVALID','图片存储地址不匹配，无法删除。');
  if(error.message.includes('MEDIA_IN_USE')) throw new ServiceError(409,'MEDIA_IN_USE','这张图片正被文章草稿或已发布文章使用，请先移除文章中的引用。');
  if(error.message.includes('MEDIA_NOT_FOUND')) throw new ServiceError(404,'NOT_FOUND','图片不存在或已删除。');
  if(['42P01','42703','42883','PGRST202','PGRST204','PGRST205'].includes(error.code??'')) throw new ServiceError(503,'MIGRATION_REQUIRED','图片删除功能需要先更新数据库。');
  throw new ServiceError(503,'DATABASE_UNAVAILABLE','图片删除暂时无法完成，请重试。');
}
export async function DELETE(request:Request, context:Context) {
 return handleAdmin(request,async({userId})=>{
  const id=(await context.params).id.toLowerCase(); const client=getServiceSupabase();
  const parsed=z.object({revision:z.number().int().min(1).max(Number.MAX_SAFE_INTEGER).nullable()}).strict().safeParse(await readJson(request));
  if(!parsed.success) throw new ServiceError(400,'INVALID_BODY','照片版本无效，请刷新后重试。');
  const call=async(name:string,owner:string,mediaId:string,revision?:number|null)=>{const {data,error}=await client.rpc(name,{p_owner:owner,p_id:mediaId,...(name==='begin_media_delete'?{p_revision:revision}: {})}); if(error) errorFor(error); if(typeof data!=='string') throw new ServiceError(503,'DATABASE_UNAVAILABLE','删除结果未确认，请重试。');return data;};
  const deletedId=await deleteMedia(userId,id,parsed.data.revision,{begin:(owner,mediaId,revision)=>call('begin_media_delete',owner,mediaId,revision),finish:(owner,mediaId)=>call('finish_media_delete',owner,mediaId)},r2Storage());
  revalidatePath('/album'); return {deletedId};
 });
}

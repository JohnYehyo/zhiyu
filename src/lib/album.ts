import "server-only";
import { createClient } from "@supabase/supabase-js";
import { hasSupabaseConfig, publicSupabaseKey, publicSupabaseUrl } from "./config";
import type { PublicAlbumPhoto, PublicAlbumCollection } from "./album-types";
import type { PageInfo } from "./admin/queries";

export class AlbumReadError extends Error {
  constructor(public code: string, message: string) { super(message); }
}
export interface AlbumPage { photos: PublicAlbumPhoto[]; pagination: PageInfo }

export interface AlbumOptions { page: number; pageSize: number; collectionId?: string }
export function albumQuery(params: URLSearchParams): AlbumOptions {
  for (const key of params.keys())
    if (!["page", "pageSize", "collectionId"].includes(key) || params.getAll(key).length !== 1)
      throw new AlbumReadError("INVALID_QUERY", "相册分页参数无效。");
  const number = (name:string, fallback:number, max:number) => {
    const value=params.get(name);
    if (value===null) return fallback;
    if (!/^[1-9]\d*$/.test(value) || Number(value)>max)
      throw new AlbumReadError("INVALID_QUERY", "相册分页参数无效。");
    return Number(value);
  };
  const collectionId=params.get("collectionId");
  if(collectionId!==null&&collectionId!=="unassigned"&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(collectionId))
    throw new AlbumReadError("INVALID_QUERY", "相册分组参数无效。");
  return {page:number("page",1,10000),pageSize:number("pageSize",24,100),...(collectionId===null?{}:{collectionId:collectionId.toLowerCase()})};
}

const examples: PublicAlbumPhoto[] = [
  ["meadow", "走到哪里，就把快乐留在哪里。", "青草地上的小小风景"],
  ["flowers", "收藏今天的一束小花。", "蓝色花瓶里的鲜花"],
  ["picnic", "一个不赶时间的下午。", "草莓与粉色格子布"],
  ["sea", "一起听海浪的声音。", "蓝色的海边"],
  ["window", "阳光落在窗边。", "窗边的日常"],
  ["sun", "今天也有值得开心的小事。", "温暖的阳光"],
].map(([key,caption,alt],index)=>({id:`example-${key}`,storageKey:`/assets/${key}.svg`,caption,alt,date:`2026-05-${String(20-index).padStart(2,"0")}`,publishedAt:"2026-05-20T00:00:00Z",demo:true}));

export async function getAlbumPage(options: AlbumOptions={page:1,pageSize:24}): Promise<AlbumPage> {
  const {page,pageSize}=options;
  if (!hasSupabaseConfig()) {
    const filtered=!options.collectionId||options.collectionId==="unassigned"?examples:[];
    return {photos:filtered.slice((page-1)*pageSize,page*pageSize),pagination:{page,pageSize,total:filtered.length}};
  }
  const client=createClient(publicSupabaseUrl(),publicSupabaseKey(),{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
  });
  let query=client.from("published_album_photos")
    .select("id,storage_key,caption,alt,taken_on,published_at,collection_id",{count:"exact"})
    .order("sort_date",{ascending:false}).order("published_at",{ascending:false}).order("id",{ascending:false});
  if(options.collectionId==="unassigned")query=query.is("collection_id",null);
  else if(options.collectionId)query=query.eq("collection_id",options.collectionId);
  const {data,error,count}=await query.range((page-1)*pageSize,page*pageSize-1);
  if(error) {
    if (["42P01","PGRST205","42703","PGRST204"].includes(error.code))
      throw new AlbumReadError("ALBUM_MIGRATION_REQUIRED","相册正在准备中。");
    throw new AlbumReadError("ALBUM_UNAVAILABLE","相册暂时无法读取，请稍后重试。");
  }
  const photos=(data??[]).map(row=>({id:row.id,storageKey:row.storage_key,caption:row.caption,alt:row.alt,date:row.taken_on,publishedAt:row.published_at,collectionId:row.collection_id??null}));
  return {photos,pagination:{page,pageSize,total:count??0}};
}


export async function getAlbumCollections(): Promise<PublicAlbumCollection[]> {
  if(!hasSupabaseConfig())return [{id:null,title:"未分组",description:"",photoCount:examples.length,coverStorageKey:examples[0]?.storageKey??null}];
  const client=createClient(publicSupabaseUrl(),publicSupabaseKey(),{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
  });
  const collections:PublicAlbumCollection[]=[];
  // Range through the public aggregate rather than silently truncating at PostgREST's row limit.
  for(let start=0;;start+=1000){
    const {data,error,count}=await client.from("published_album_collections")
      .select("collection_id,title,description,photo_count,cover_storage_key",{count:"exact"})
      .order("collection_id",{ascending:true,nullsFirst:false}).range(start,start+999);
    if(error){
      if(error.code==="PGRST103"&&start>0)break;
      if(["42P01","PGRST205","42703","PGRST204"].includes(error.code))
        throw new AlbumReadError("ALBUM_MIGRATION_REQUIRED","相册正在准备中。");
      throw new AlbumReadError("ALBUM_UNAVAILABLE","相册暂时无法读取，请稍后重试。");
    }
    for(const row of data??[])collections.push({id:row.collection_id,title:row.title,description:row.description,photoCount:Number(row.photo_count),coverStorageKey:row.cover_storage_key});
    if(!data||data.length<1000||(count!==null&&start+data.length>=count))break;
  }
  return collections;
}

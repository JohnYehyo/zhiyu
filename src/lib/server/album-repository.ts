import "server-only";
import { getServiceSupabase } from "../supabase/service";
import type { AlbumPhoto } from "../album-types";
import type { PageInfo } from "../admin/queries";
import type { AlbumCreate, AlbumPatch, AlbumQuery } from "./album-security";
import { ServiceError } from "./errors";

interface AlbumRow {
  id: string;
  media_id: string;
  collection_id: string | null;
  storage_key: string;
  caption: string;
  alt: string;
  taken_on: string;
  revision: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}
const columns = "id,media_id,collection_id,storage_key,caption,alt,taken_on,revision,published,created_at,updated_at";
function photo(row: AlbumRow): AlbumPhoto {
  return {
    id: row.id,
    mediaId: row.media_id,
    collectionId: row.collection_id,
    storageKey: row.storage_key,
    caption: row.caption,
    alt: row.alt,
    date: row.taken_on,
    revision: Number(row.revision),
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
export function albumDatabaseError(error: { message: string; code?: string }): never {
  if (["42P01", "42703", "42883", "PGRST202", "PGRST204", "PGRST205"].includes(error.code ?? "") || error.message.includes("ALBUM_MEDIA_REQUIRED"))
    throw new ServiceError(503, "ALBUM_MIGRATION_REQUIRED", "相册尚未准备好，请执行相册迁移 SQL。");
  if (error.message.includes("COLLECTION_CONFLICT"))
    throw new ServiceError(409, "COLLECTION_CONFLICT", "相册集已在其他页面修改，请刷新后重试。");
  if (error.message.includes("COLLECTION_NOT_FOUND"))
    throw new ServiceError(404, "COLLECTION_NOT_FOUND", "相册集不存在，请刷新后重试。");
  if (error.message.includes("ALBUM_CONFLICT"))
    throw new ServiceError(409, "ALBUM_CONFLICT", "照片已在其他页面修改，请刷新后重试。");
  if (error.message.includes("ALBUM_DUPLICATE") || error.code === "23505")
    throw new ServiceError(409, "ALBUM_DUPLICATE", "这张图片已在相册中，请刷新查看。");
  if (error.message.includes("NOT_FOUND"))
    throw new ServiceError(404, "NOT_FOUND", "相册照片不存在。");
  if (error.message.includes("MEDIA_NOT_READY"))
    throw new ServiceError(409, "MEDIA_NOT_READY", "图片未完成上传或不属于此账号。");
  throw new ServiceError(503, "DATABASE_UNAVAILABLE", "相册暂时无法完成操作，请稍后重试。");
}
export async function listAlbumPage(owner: string, options: AlbumQuery): Promise<{ photos: AlbumPhoto[]; pagination: PageInfo }> {
  const start = (options.page - 1) * options.pageSize;
  let query = getServiceSupabase()
    .from("album_photos")
    .select(columns, { count: "exact" })
    .eq("owner_id", owner);
  if (options.collectionId === "unassigned") query = query.is("collection_id", null);
  else if (options.collectionId) query = query.eq("collection_id", options.collectionId);
  const { data, error, count } = await query
    .order("updated_at", { ascending: false })
    .order("id")
    .range(start, start + options.pageSize - 1);
  if (error?.code === "PGRST103" && options.page > 1)
    return listAlbumPage(owner, { ...options, page: 1 });
  if (error) albumDatabaseError(error);
  if (!Array.isArray(data) || count === null)
    albumDatabaseError({ message: "Invalid album page response" });
  const lastPage = Math.max(1, Math.ceil(count / options.pageSize));
  if (options.page > lastPage) return listAlbumPage(owner, { ...options, page: lastPage });
  return { photos: (data as AlbumRow[]).map(photo), pagination: { page: options.page, pageSize: options.pageSize, total: count } };
}
export async function createAlbumPhoto(owner: string, draft: AlbumCreate): Promise<AlbumPhoto> {
  const { data, error } = await getServiceSupabase().rpc("create_album_photo", {
    p_owner: owner,
    p_media_id: draft.mediaId,
    p_caption: draft.caption,
    p_alt: draft.alt,
    p_taken_on: draft.date,
    ...(draft.collectionId !== undefined ? { p_collection_id: draft.collectionId } : {}),
  });
  if (error) albumDatabaseError(error);
  if (!data || typeof data !== "object") albumDatabaseError({ message: "Invalid album create response" });
  return photo(data as AlbumRow);
}
export async function updateAlbumPhoto(owner: string, id: string, draft: AlbumPatch): Promise<AlbumPhoto> {
  const { data, error } = await getServiceSupabase().rpc("update_album_photo", {
    p_id: id.toLowerCase(),
    p_owner: owner,
    p_revision: draft.revision,
    p_caption: draft.caption,
    p_alt: draft.alt,
    p_taken_on: draft.date,
    ...(draft.collectionId !== undefined ? { p_collection_id: draft.collectionId } : {}),
    p_published: draft.published,
  });
  if (error) albumDatabaseError(error);
  if (!data || typeof data !== "object") albumDatabaseError({ message: "Invalid album update response" });
  return photo(data as AlbumRow);
}
export async function removeAlbumPhoto(owner: string, id: string, revision: number): Promise<string> {
  const canonicalId = id.toLowerCase();
  const { data, error } = await getServiceSupabase().rpc("remove_album_photo", { p_id: canonicalId, p_owner: owner, p_revision: revision });
  if (error) albumDatabaseError(error);
  if (data !== canonicalId) albumDatabaseError({ message: "Invalid album removal response" });
  return canonicalId;
}

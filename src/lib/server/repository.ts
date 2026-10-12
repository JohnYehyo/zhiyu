import "server-only";
import { getServiceSupabase } from "../supabase/service";
import type { DraftPost, MediaRecord, PostDraft } from "../types";
import type { UploadRepository } from "./upload-service";
import { ServiceError } from "./errors";
interface DraftRow {
  id: string;
  revision: number;
  draft: PostDraft;
  published_revision: number | null;
  published_at: string | null;
  updated_at: string;
}
interface MediaRow {
  id: string;
  owner_id: string;
  storage_key: string;
  mime_type: string;
  size: number;
  status: "pending" | "ready";
}
function post(row: DraftRow): DraftPost {
  return {
    id: row.id,
    revision: Number(row.revision),
    draft: row.draft,
    publishedRevision:
      row.published_revision === null ? null : Number(row.published_revision),
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
}
function media(row: MediaRow): MediaRecord {
  return {
    id: row.id,
    storageKey: row.storage_key,
    mimeType: row.mime_type,
    size: Number(row.size),
    status: row.status,
  };
}
export function databaseError(error: {
  message: string;
  code?: string;
}): never {
  if (error.message.includes("REVISION_CONFLICT"))
    throw new ServiceError(
      409,
      "REVISION_CONFLICT",
      "稿件已在其他页面修改，请刷新后重试。",
    );
  if (error.message.includes("NOT_FOUND"))
    throw new ServiceError(404, "NOT_FOUND", "稿件不存在。");
  if (error.message.includes("MEDIA_NOT_READY"))
    throw new ServiceError(
      409,
      "MEDIA_NOT_READY",
      "媒体未完成上传或不属于此账号。",
    );
  if (error.code === "23505")
    throw new ServiceError(
      409,
      "SLUG_CONFLICT",
      "文章地址已被使用，请修改 slug。",
    );
  throw new ServiceError(
    503,
    "DATABASE_UNAVAILABLE",
    "数据库暂时无法完成操作，请稍后重试。",
  );
}
export async function listDrafts(owner: string): Promise<DraftPost[]> {
  const { data, error } = await getServiceSupabase()
    .from("draft_posts")
    .select("*")
    .eq("owner_id", owner)
    .order("updated_at", { ascending: false });
  if (error) databaseError(error);
  return (data as DraftRow[]).map(post);
}
export async function getDraft(owner: string, id: string): Promise<DraftPost> {
  const { data, error } = await getServiceSupabase()
    .from("draft_posts")
    .select("*")
    .eq("id", id)
    .eq("owner_id", owner)
    .maybeSingle();
  if (error) databaseError(error);
  if (!data) throw new ServiceError(404, "NOT_FOUND", "稿件不存在。");
  return post(data as DraftRow);
}
export async function createDraft(
  owner: string,
  draft: PostDraft,
): Promise<DraftPost> {
  const { data, error } = await getServiceSupabase()
    .from("draft_posts")
    .insert({ owner_id: owner, draft })
    .select("*")
    .single();
  if (error) databaseError(error);
  return post(data as DraftRow);
}
export async function mutateDraft(
  name: "save_draft" | "publish_post" | "unpublish_post",
  owner: string,
  id: string,
  revision: number,
  draft?: PostDraft,
): Promise<DraftPost> {
  const { data, error } = await getServiceSupabase().rpc(name, {
    p_id: id,
    p_owner: owner,
    p_revision: revision,
    ...(draft ? { p_draft: draft } : {}),
  });
  if (error) databaseError(error);
  return post(data as DraftRow);
}
export function uploadRepository(): UploadRepository {
  const client = getServiceSupabase();
  return {
    async create(value) {
      const { data, error } = await client
        .from("media")
        .insert({
          id: value.id,
          owner_id: value.ownerId,
          storage_key: value.storageKey,
          mime_type: value.mimeType,
          size: value.size,
          status: "pending",
        })
        .select("*")
        .single();
      if (error) databaseError(error);
      return media(data as MediaRow);
    },
    async get(id) {
      const { data, error } = await client
        .from("media")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) databaseError(error);
      return data
        ? { ...media(data as MediaRow), ownerId: data.owner_id }
        : null;
    },
    async ready(id, owner) {
      const { data, error } = await client
        .from("media")
        .update({ status: "ready" })
        .eq("id", id)
        .eq("owner_id", owner)
        .select("*")
        .single();
      if (error) databaseError(error);
      return media(data as MediaRow);
    },
  };
}

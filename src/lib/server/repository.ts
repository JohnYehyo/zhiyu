import "server-only";
import { getServiceSupabase } from "../supabase/service";
import type { DraftPost, MediaRecord, PostDraft } from "../types";
import type { UploadRepository } from "./upload-service";
import { ServiceError } from "./errors";
import {
  literalSearchPattern,
  type MediaQuery,
  type PostQuery,
  type PageInfo,
} from "../admin/queries";
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
  original_name?: string | null;
  created_at?: string;
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
    filename: row.original_name || undefined,
    createdAt: row.created_at,
  };
}
export function databaseError(error: {
  message: string;
  code?: string;
}): never {
  if (
    ["42P01", "42703", "PGRST202", "PGRST204", "PGRST205"].includes(
      error.code ?? "",
    )
  )
    throw new ServiceError(
      503,
      "MIGRATION_REQUIRED",
      "数据库尚未初始化或需要更新，请按接入说明执行迁移 SQL。",
    );
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
export async function listDraftPage(owner: string, options: PostQuery): Promise<{ posts: DraftPost[]; pagination: PageInfo }> {
  let query = getServiceSupabase()
    .from("draft_posts")
    .select("*", { count: "exact" })
    .eq("owner_id", owner);
  if (options.status !== "all") query = query.eq("status", options.status);
  if (options.q)
    query = query.ilike("draft->>title", literalSearchPattern(options.q));
  const start = (options.page - 1) * options.pageSize;
  const { data, error, count } = await query
    .order("updated_at", { ascending: false })
    .order("id")
    .range(start, start + options.pageSize - 1);
  if (error?.code === "PGRST103" && options.page > 1)
    return listDraftPage(owner, { ...options, page: 1 });
  if (error) databaseError(error);
  if (!Array.isArray(data) || count === null)
    databaseError({ message: "Invalid page response" });
  return {
    posts: (data as DraftRow[]).map(post),
    pagination: {
      page: options.page,
      pageSize: options.pageSize,
      total: count,
    },
  };
}
export async function listMediaPage(owner: string, options: MediaQuery): Promise<{ media: MediaRecord[]; pagination: PageInfo }> {
  let query = getServiceSupabase()
    .from("media")
    .select("*", { count: "exact" })
    .eq("owner_id", owner)
    .eq("status", "ready");
  if (options.kind !== "all")
    query = query.like("mime_type", `${options.kind}/%`);
  const start = (options.page - 1) * options.pageSize;
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id")
    .range(start, start + options.pageSize - 1);
  if (error?.code === "PGRST103" && options.page > 1)
    return listMediaPage(owner, { ...options, page: 1 });
  if (error) databaseError(error);
  if (!Array.isArray(data) || count === null)
    databaseError({ message: "Invalid page response" });
  return {
    media: (data as MediaRow[]).map(media),
    pagination: {
      page: options.page,
      pageSize: options.pageSize,
      total: count,
    },
  };
}
export async function deleteDraft(
  owner: string,
  id: string,
  revision: number,
): Promise<string> {
  const canonicalId = id.toLowerCase();
  const { data, error } = await getServiceSupabase().rpc("delete_post", {
    p_id: canonicalId,
    p_owner: owner,
    p_revision: revision,
  });
  if (error) databaseError(error);
  if (data !== canonicalId) databaseError({ message: "Invalid deletion response" });
  return canonicalId;
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
          original_name: value.filename,
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

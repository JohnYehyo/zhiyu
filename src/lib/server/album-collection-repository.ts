import "server-only";
import type { AlbumCollection } from "../album-types";
import { getServiceSupabase } from "../supabase/service";
import { albumDatabaseError } from "./album-repository";
import type { AlbumCollectionCreate, AlbumCollectionPatch } from "./album-collection-security";
interface CollectionRow {
  id: string; title: string; description: string; revision: number; photo_count: number; created_at: string; updated_at: string;
}
function collection(row: CollectionRow): AlbumCollection {
  return { id: row.id, title: row.title, description: row.description, revision: Number(row.revision), photoCount: Number(row.photo_count), createdAt: row.created_at, updatedAt: row.updated_at };
}
export async function listAlbumCollections(owner: string): Promise<AlbumCollection[]> {
  const { data, error } = await getServiceSupabase().rpc("list_album_collections", { p_owner: owner });
  if (error) albumDatabaseError(error);
  if (!Array.isArray(data)) albumDatabaseError({ message: "Invalid collection list response" });
  return (data as CollectionRow[]).map(collection);
}
export async function createAlbumCollection(owner: string, draft: AlbumCollectionCreate): Promise<AlbumCollection> {
  const { data, error } = await getServiceSupabase().rpc("create_album_collection", { p_owner: owner, p_title: draft.title, p_description: draft.description });
  if (error) albumDatabaseError(error);
  if (!data || typeof data !== "object") albumDatabaseError({ message: "Invalid collection response" });
  return collection(data as CollectionRow);
}
export async function updateAlbumCollection(owner: string, id: string, draft: AlbumCollectionPatch): Promise<AlbumCollection> {
  const { data, error } = await getServiceSupabase().rpc("update_album_collection", { p_id: id.toLowerCase(), p_owner: owner, p_revision: draft.revision, p_title: draft.title, p_description: draft.description });
  if (error) albumDatabaseError(error);
  if (!data || typeof data !== "object") albumDatabaseError({ message: "Invalid collection response" });
  return collection(data as CollectionRow);
}
export async function removeAlbumCollection(owner: string, id: string, revision: number): Promise<string> {
  const canonicalId = id.toLowerCase();
  const { data, error } = await getServiceSupabase().rpc("remove_album_collection", { p_id: canonicalId, p_owner: owner, p_revision: revision });
  if (error) albumDatabaseError(error);
  if (data !== canonicalId) albumDatabaseError({ message: "Invalid collection removal response" });
  return canonicalId;
}

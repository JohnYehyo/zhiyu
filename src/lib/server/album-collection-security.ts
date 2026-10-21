import { z } from "zod";
import { ServiceError } from "./errors";
const fields = { title: z.string().trim().min(1).max(100), description: z.string().max(1000) };
const createSchema = z.object(fields).strict();
const patchSchema = z.object({ ...fields, revision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER) }).strict();
const coverSchema = z.object({ revision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER), photoId: z.string().uuid().transform(value => value.toLowerCase()).nullable() }).strict();
export type AlbumCollectionCreate = z.infer<typeof createSchema>;
export type AlbumCollectionPatch = z.infer<typeof patchSchema>;
export type AlbumCollectionCover = z.infer<typeof coverSchema>;
export function validateAlbumCollectionCreate(input: unknown): AlbumCollectionCreate {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) throw new ServiceError(400, "INVALID_BODY", "请填写相册集名称（最多100字）和说明（最多1000字）。");
  return parsed.data;
}
export function validateAlbumCollectionPatch(input: unknown): AlbumCollectionPatch {
  const parsed = patchSchema.safeParse(input);
  if (!parsed.success) throw new ServiceError(400, "INVALID_BODY", "相册集内容或编辑版本无效。");
  return parsed.data;
}
export function validateAlbumCollectionCover(input: unknown): AlbumCollectionCover {
  const parsed = coverSchema.safeParse(input);
  if (!parsed.success) throw new ServiceError(400, "INVALID_BODY", "封面照片或相册集编辑版本无效。");
  return parsed.data;
}
export function parseCollectionDeleteQuery(params: URLSearchParams): number {
  const raw = params.get("revision");
  if ([...params.keys()].some(key => key !== "revision") || params.getAll("revision").length !== 1 || !raw || !/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(Number(raw)))
    throw new ServiceError(400, "INVALID_QUERY", "相册集编辑版本无效。");
  return Number(raw);
}

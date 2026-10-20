import { z } from "zod";
import type { AlbumDraft } from "../album-types";
import { ServiceError } from "./errors";

export interface AlbumQuery { page: number; pageSize: number; collectionId?: string }
export interface AlbumCreate extends AlbumDraft { mediaId: string }
export interface AlbumPatch extends AlbumDraft { revision: number; published: boolean }

function calendarDate(value: string): boolean {
  if (value === "") return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= days[month - 1];
}
const fields = {
  collectionId: z.string().uuid().nullable().optional(),
  caption: z.string().max(1000),
  alt: z.string().max(500),
  date: z.string().refine(calendarDate),
};
const createSchema = z.object({ ...fields, mediaId: z.string().uuid() }).strict();
const patchSchema = z.object({
  ...fields,
  revision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  published: z.boolean(),
}).strict();
function invalidBody(): never {
  throw new ServiceError(400, "INVALID_BODY", "相册内容格式、日期或长度不符合要求。");
}
export function validateAlbumCreate(input: unknown): AlbumCreate {
  const result = createSchema.safeParse(input);
  if (!result.success) invalidBody();
  return result.data;
}
export function validateAlbumPatch(input: unknown): AlbumPatch {
  const result = patchSchema.safeParse(input);
  if (!result.success) invalidBody();
  return result.data;
}
export function parseAlbumQuery(params: URLSearchParams): AlbumQuery {
  const invalid = (): never => { throw new ServiceError(400, "INVALID_QUERY", "相册分页条件无效。"); };
  for (const key of params.keys())
    if (!["page", "pageSize", "collectionId"].includes(key) || params.getAll(key).length !== 1) invalid();
  const number = (key: string, fallback: number, max: number) => {
    const raw = params.get(key);
    if (raw === null) return fallback;
    if (!/^[1-9]\d*$/.test(raw)) invalid();
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value > max) invalid();
    return value;
  };
  const collectionId = params.get("collectionId");
  if (collectionId !== null && collectionId !== "unassigned" && !z.string().uuid().safeParse(collectionId).success) invalid();
  return { page: number("page", 1, 10000), pageSize: number("pageSize", 15, 100), ...(collectionId !== null ? { collectionId: collectionId.toLowerCase() } : {}) };
}

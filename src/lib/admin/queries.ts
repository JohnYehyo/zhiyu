import { ServiceError } from "../server/errors";

export type PostStatus = "all" | "draft" | "published" | "changed";
export type MediaKind = "all" | "image" | "video";
export interface PageInfo {
  page: number;
  pageSize: number;
  total: number;
}
export interface PostQuery {
  page: number;
  pageSize: number;
  status: PostStatus;
  q: string;
}
export interface MediaQuery {
  page: number;
  pageSize: number;
  kind: MediaKind;
}

function invalid(): never {
  throw new ServiceError(400, "INVALID_QUERY", "筛选条件无效，请重新选择。");
}
function strictFields(params: URLSearchParams, allowed: string[]) {
  for (const key of params.keys()) {
    if (!allowed.includes(key) || params.getAll(key).length !== 1) invalid();
  }
}
function number(
  params: URLSearchParams,
  key: string,
  fallback: number,
  max: number,
) {
  const raw = params.get(key);
  if (raw === null) return fallback;
  if (!/^[1-9]\d*$/.test(raw)) invalid();
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value > max) invalid();
  return value;
}
function choice<T extends string>(
  params: URLSearchParams,
  key: string,
  values: readonly T[],
  fallback: T,
): T {
  const value = params.get(key) ?? fallback;
  if (!values.includes(value as T)) invalid();
  return value as T;
}
export function parsePostQuery(params: URLSearchParams): PostQuery {
  strictFields(params, ["page", "pageSize", "status", "q"]);
  const q = (params.get("q") ?? "").trim();
  if (q.length > 100) invalid();
  return {
    page: number(params, "page", 1, 10000),
    pageSize: number(params, "pageSize", 20, 100),
    status: choice(
      params,
      "status",
      ["all", "draft", "published", "changed"],
      "all",
    ),
    q,
  };
}
export function parseMediaQuery(params: URLSearchParams): MediaQuery {
  strictFields(params, ["page", "pageSize", "kind"]);
  return {
    page: number(params, "page", 1, 10000),
    pageSize: number(params, "pageSize", 12, 100),
    kind: choice(params, "kind", ["all", "image", "video"], "all"),
  };
}
export function literalSearchPattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
}

import { createClient } from "@supabase/supabase-js";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { beforeAll, afterAll, beforeEach, afterEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({
  db: null as PGlite | null,
  user: null as { id: string } | null,
  authError: null as { message: string } | null,
  requests: [] as { url: URL; body: Record<string, unknown> | null }[],
  failure: null as { message: string; code: string } | null,
  invalidRange: false,
  revalidate: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: state.revalidate }));
vi.mock("../supabase/server", () => ({ getServerSupabase: async () => ({ auth: {
  getUser: async () => ({ data: { user: state.user }, error: state.authError }),
  getSession: () => { throw Error("Unverified session cannot authorize albums"); },
} }) }));
vi.mock("../supabase/service", () => ({ getServiceSupabase: () => createClient("https://unit.supabase.co", "synthetic-key", {
  auth: { persistSession: false },
  global: { fetch: async (input, init) => {
    const url = new URL(String(input));
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    state.requests.push({ url, body });
    const response = (value: unknown, status = 200, total?: number) => new Response(JSON.stringify(value), {
      status, headers: { "Content-Type": "application/json", ...(total !== undefined ? { "Content-Range": `0-${Math.max(0,total-1)}/${total}` } : {}) },
    });
    if (state.failure) return response(state.failure, 400);
    if (state.invalidRange && Number(url.searchParams.get("offset")) > 0)
      return response({ code: "PGRST103", message: "Requested range not satisfiable" }, 416);
    try {
      if (url.pathname === "/rest/v1/album_photos") {
        const owner = url.searchParams.get("owner_id")?.replace(/^eq\./, "");
        const filter = url.searchParams.get("collection_id");
        const where = filter === "is.null" ? " and collection_id is null" : filter?.startsWith("eq.") ? " and collection_id=$4" : "";
        const values = [owner, Number(url.searchParams.get("limit")), Number(url.searchParams.get("offset")), ...(filter?.startsWith("eq.") ? [filter.slice(3)] : [])];
        const rows = (await state.db!.query(`select * from public.album_photos where owner_id=$1${where} order by updated_at desc,id asc limit $2 offset $3`, values)).rows;
        const total = (await state.db!.query<{ total: number }>(`select count(*)::int as total from (select id from public.album_photos where owner_id=$1${where} limit $2 offset $3) p`, [owner, 100000, 0, ...(filter?.startsWith("eq.") ? [filter.slice(3)] : [])])).rows[0].total;
        return response(rows, 200, total);
      }
      const args = body as Record<string, unknown>;
      const membership = args.p_collection_id !== undefined ? [args.p_collection_id] : [];
      let result;
      if (url.pathname.endsWith("/create_album_photo")) result = await state.db!.query<{ result: unknown }>(`select public.create_album_photo($1,$2,$3,$4,$5${membership.length ? ",$6" : ""}) as result`, [args.p_owner, args.p_media_id, args.p_caption, args.p_alt, args.p_taken_on,...membership]);
      else if (url.pathname.endsWith("/update_album_photo")) result = await state.db!.query<{ result: unknown }>(`select public.update_album_photo($1,$2,$3,$4,$5,$6,$7${membership.length ? ",$8" : ""}) as result`, [args.p_id, args.p_owner, args.p_revision, args.p_caption, args.p_alt, args.p_taken_on, args.p_published,...membership]);
      else if (url.pathname.endsWith("/remove_album_photo")) result = await state.db!.query<{ result: unknown }>("select public.remove_album_photo($1,$2,$3) as result", [args.p_id, args.p_owner, args.p_revision]);
      else if (url.pathname.endsWith("/list_album_collections")) result = await state.db!.query<{result:unknown}>("select public.list_album_collections($1) as result",[args.p_owner]);
      else if (url.pathname.endsWith("/create_album_collection")) result = await state.db!.query<{result:unknown}>("select public.create_album_collection($1,$2,$3) as result",[args.p_owner,args.p_title,args.p_description]);
      else if (url.pathname.endsWith("/update_album_collection")) result = await state.db!.query<{result:unknown}>("select public.update_album_collection($1,$2,$3,$4,$5) as result",[args.p_id,args.p_owner,args.p_revision,args.p_title,args.p_description]);
      else if (url.pathname.endsWith("/remove_album_collection")) result = await state.db!.query<{result:unknown}>("select public.remove_album_collection($1,$2,$3) as result",[args.p_id,args.p_owner,args.p_revision]);
      else throw Error("Unexpected album endpoint");
      return response(result.rows[0].result);
    } catch (error) { return response({ message: (error as Error).message, code: (error as { code?: string }).code ?? "P0001" }, 400); }
  } },
}) }));

import { GET, POST } from "@/app/api/admin/album/route";
import { PATCH, DELETE } from "@/app/api/admin/album/[id]/route";
import { GET as collectionsGET, POST as collectionsPOST } from "@/app/api/admin/album/collections/route";
import { PATCH as collectionsPATCH, DELETE as collectionsDELETE } from "@/app/api/admin/album/collections/[id]/route";
import { listAlbumPage } from "./album-repository";
const owner = "11111111-1111-4111-8111-111111111111";
const foreign = "22222222-2222-4222-8222-222222222222";
const mediaId = "44444444-4444-4444-8444-444444444444";
const metadata = { caption: "花园", alt: "午后", date: "2026-10-14" };
const request = (method: string, body: unknown, origin = "http://localhost") => new Request("http://localhost/api/admin/album", { method, headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
const context = (id: string) => ({ params: Promise.resolve({ id }) });
const add = () => POST(request("POST", { mediaId, ...metadata }));
beforeAll(async () => {
  state.db = new PGlite();
  await state.db.exec("create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon,authenticated,service_role;");
  await state.db.exec(await readFile(new URL("../../../supabase/migrations/202610120001_initial.sql", import.meta.url), "utf8"));
  await state.db.query(await readFile(new URL("../../../supabase/setup/query-album.sql", import.meta.url), "utf8"));
  await state.db.query(await readFile(new URL("../../../supabase/setup/query-album-collections.sql", import.meta.url), "utf8"));
}, 30000);
afterAll(async () => { await state.db?.close(); });
beforeEach(async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://unit.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "synthetic-public");
  vi.stubEnv("SUPABASE_SECRET_KEY", "synthetic-secret");
  vi.stubEnv("ADMIN_USER_ID", owner);
  state.user = { id: owner };
  state.authError = null;
  state.failure = null;
  state.invalidRange = false;
  state.requests = [];
  state.revalidate.mockClear();
  await state.db!.exec("reset role; truncate public.published_album_photos,public.album_photos,public.album_collections,public.media;");
  await state.db!.query("insert into public.media(id,owner_id,storage_key,mime_type,size,status) values($1,$2,$3,'image/jpeg',100,'ready')", [mediaId, owner, `blob/${owner}/${mediaId}.jpg`]);
  await state.db!.exec("set role service_role");
});
afterEach(() => { vi.unstubAllEnvs(); });

it("runs add, publish/save, private list and removal against real SQL without leaking database fields", async () => {
  const response = await add();
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  const { photo } = await response.json();
  expect(photo).toMatchObject({ mediaId, ...metadata, revision: 1, published: false });
  expect(Object.keys(photo).sort()).toEqual(["alt", "caption", "collectionId", "createdAt", "date", "id", "mediaId", "published", "revision", "storageKey", "updatedAt"]);
  expect(state.revalidate).not.toHaveBeenCalled();
  const saved = await PATCH(request("PATCH", { ...metadata, caption: "公开图注", revision: 1, published: true }), context(photo.id));
  expect(saved.status).toBe(200);
  expect((await saved.json()).photo).toMatchObject({ caption: "公开图注", revision: 2, published: true });
  expect(state.revalidate).toHaveBeenCalledWith("/album");
  const page = await GET(new Request("http://localhost/api/admin/album?page=1&pageSize=10"));
  expect(await page.json()).toMatchObject({ photos: [{ id: photo.id, caption: "公开图注" }], pagination: { page: 1, pageSize: 10, total: 1 } });
  const query = state.requests.find(({ url }) => url.pathname === "/rest/v1/album_photos")!.url.searchParams;
  expect(query.get("owner_id")).toBe(`eq.${owner}`);
  const removed = await DELETE(request("DELETE", { revision: 2 }), context(photo.id.toUpperCase()));
  expect(await removed.json()).toEqual({ deletedId: photo.id });
  expect((await state.db!.query("select id from public.media")).rows).toEqual([{ id: mediaId }]);
});
it("rejects unauthenticated, foreign, auth-error and cross-origin requests before database access", async () => {
  state.user = null;
  expect((await add()).status).toBe(401);
  state.user = { id: foreign };
  expect((await GET(new Request("http://localhost/api/admin/album"))).status).toBe(403);
  state.user = { id: owner };
  state.authError = { message: "Invalid token" };
  expect((await add()).status).toBe(401);
  state.authError = null;
  expect((await POST(request("POST", { mediaId, ...metadata }, "https://foreign.example"))).status).toBe(403);
  expect(state.requests).toEqual([]);
});
it("validates unknown payload/query fields and route identity before issuing RPC calls", async () => {
  expect((await POST(request("POST", { mediaId, ...metadata, url: "https://fake" }))).status).toBe(400);
  expect((await GET(new Request("http://localhost/api/admin/album?owner=x"))).status).toBe(400);
  expect((await PATCH(request("PATCH", { ...metadata, revision: 1, published: true }), context("invalid"))).status).toBe(400);
  expect((await DELETE(request("DELETE", { revision: 1, mediaId }), context(mediaId))).status).toBe(400);
  expect(state.requests).toEqual([]);
});
it("reports duplicate and stale edit conflicts without exposing SQL messages or changing snapshots", async () => {
  const { photo } = await (await add()).json();
  expect(await (await add()).json()).toMatchObject({ code: "ALBUM_DUPLICATE" });
  await PATCH(request("PATCH", { ...metadata, revision: 1, published: true }), context(photo.id));
  const stale = await PATCH(request("PATCH", { ...metadata, caption: "旧版本", revision: 1, published: true }), context(photo.id));
  expect(stale.status).toBe(409);
  expect(await stale.json()).toMatchObject({ code: "ALBUM_CONFLICT" });
  expect((await state.db!.query("select caption from public.published_album_photos")).rows).toEqual([{ caption: "花园" }]);
});
it.each([
  ["42P01", "missing table", "ALBUM_MIGRATION_REQUIRED", 503],
  ["PGRST202", "missing RPC", "ALBUM_MIGRATION_REQUIRED", 503],
  ["P0001", "NOT_FOUND", "NOT_FOUND", 404],
  ["P0001", "MEDIA_NOT_READY", "MEDIA_NOT_READY", 409],
  ["XX000", "private SQL detail", "DATABASE_UNAVAILABLE", 503],
])("maps database %s/%s to safe %s", async (code, message, expected, status) => {
  state.failure = { code, message };
  const response = await add();
  expect(response.status).toBe(status);
  const body = await response.json();
  expect(body.code).toBe(expected);
  expect(body.error).not.toContain(message);
});
it("resets a removed last page to page one on PostgREST invalid range", async () => {
  await add();
  state.invalidRange = true;
  const result = await listAlbumPage(owner, { page: 3, pageSize: 20 });
  expect(result.pagination).toEqual({ page: 1, pageSize: 20, total: 1 });
  expect(result.photos).toHaveLength(1);
});

it("withdrawal immediately removes the public snapshot and invalidates the album page", async () => {
  const { photo } = await (await add()).json();
  await PATCH(request("PATCH", { ...metadata, revision: 1, published: true }), context(photo.id));
  state.revalidate.mockClear();
  const response = await PATCH(request("PATCH", { ...metadata, revision: 2, published: false }), context(photo.id));
  expect((await response.json()).photo).toMatchObject({ revision: 3, published: false });
  expect((await state.db!.query("select id from public.published_album_photos")).rows).toEqual([]);
  expect(state.revalidate).toHaveBeenCalledWith("/album");
});

it("manages collections with private counts, filters, rename, versioned deletion and safe response fields", async () => {
  const created = await collectionsPOST(request("POST",{title:"旅行",description:"路上"}));
  const {collection} = await created.json();
  expect(collection).toMatchObject({title:"旅行",description:"路上",revision:1,photoCount:0});
  expect(Object.keys(collection).sort()).toEqual(["createdAt","description","id","photoCount","revision","title","updatedAt"]);
  const {photo} = await (await POST(request("POST",{mediaId,...metadata,collectionId:collection.id}))).json();
  expect(photo.collectionId).toBe(collection.id);
  expect(await (await collectionsGET(new Request("http://localhost/api/admin/album/collections"))).json()).toMatchObject({collections:[{id:collection.id,photoCount:1}]});
  const filtered = await GET(new Request(`http://localhost/api/admin/album?collectionId=${collection.id}`));
  expect(await filtered.json()).toMatchObject({photos:[{id:photo.id}],pagination:{page:1,pageSize:15,total:1}});
  const unassigned = await GET(new Request("http://localhost/api/admin/album?collectionId=unassigned"));
  expect(await unassigned.json()).toMatchObject({photos:[],pagination:{total:0}});
  await PATCH(request("PATCH",{...metadata,revision:1,published:true}),context(photo.id));
  const renamed = await collectionsPATCH(request("PATCH",{title:"夏日",description:"新说明",revision:1}),context(collection.id));
  expect(await renamed.json()).toMatchObject({collection:{title:"夏日",revision:2}});
  expect((await state.db!.query("select title from public.published_album_collections")).rows).toEqual([{title:"夏日"}]);
  const deleteRequest = (revision:number) => new Request(`http://localhost/api/admin/album/collections/${collection.id}?revision=${revision}`,{method:"DELETE",headers:{Origin:"http://localhost"}});
  expect((await collectionsDELETE(deleteRequest(1),context(collection.id))).status).toBe(409);
  expect(await (await collectionsDELETE(deleteRequest(2),context(collection.id))).json()).toEqual({deletedId:collection.id});
  expect((await PATCH(request("PATCH",{...metadata,revision:2,published:false}),context(photo.id))).status).toBe(409);
  expect((await state.db!.query("select collection_id,published,revision::int as revision from public.album_photos")).rows).toEqual([{collection_id:null,published:true,revision:3}]);
  expect(state.revalidate).toHaveBeenCalledWith("/album");
});
it("rejects collection auth, origin, payload and revision faults before RPC", async () => {
  state.user = null;
  expect((await collectionsGET(new Request("http://localhost/api/admin/album/collections"))).status).toBe(401);
  state.user = {id:owner};
  expect((await collectionsPOST(request("POST",{title:"a",description:""},"https://foreign.example"))).status).toBe(403);
  expect((await collectionsPOST(request("POST",{title:"a",description:"",ownerId:foreign}))).status).toBe(400);
  expect((await collectionsPATCH(request("PATCH",{title:"a",description:"",revision:0}),context(mediaId))).status).toBe(400);
  expect((await collectionsDELETE(new Request("http://localhost/api/admin/album/collections/id?revision=1&revision=2",{method:"DELETE",headers:{Origin:"http://localhost"}}),context(mediaId))).status).toBe(400);
  expect(state.requests).toEqual([]);
});
it("returns safe errors when a forged collection is used to create or move a photo", async () => {
  const {collection} = (await state.db!.query<{collection:{id:string}}>("select public.create_album_collection($1,'foreign','') as collection",[foreign])).rows[0];
  const rejected = await POST(request("POST",{mediaId,...metadata,collectionId:collection.id}));
  expect(rejected.status).toBe(404); expect(await rejected.json()).toMatchObject({code:"COLLECTION_NOT_FOUND"});
  const {photo} = await (await add()).json();
  const moved = await PATCH(request("PATCH",{...metadata,revision:1,published:false,collectionId:collection.id}),context(photo.id));
  expect(moved.status).toBe(404);
  expect((await state.db!.query("select collection_id,revision::int as revision from public.album_photos")).rows).toEqual([{collection_id:null,revision:1}]);
});

it("clamps a now-empty last filtered page after photos move to another collection",async()=>{
 const result=await add(); const {photo}=await result.json();
 const page=await listAlbumPage(owner,{page:2,pageSize:15,collectionId:"unassigned"});
 expect(page.pagination).toEqual({page:1,pageSize:15,total:1});expect(page.photos.map(p=>p.id)).toEqual([photo.id]);
});

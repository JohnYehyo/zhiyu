import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";

const sql = (path: string) =>
  readFile(new URL(`../../../supabase/${path}`, import.meta.url), "utf8");
const roles = "create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon,authenticated,service_role;";

it("reproduces the original multi-command prepared statement rejection", async () => {
  const db = new PGlite();
  try {
    await db.exec(roles);
    await expect(db.query(await sql("migrations/202610120001_initial.sql")))
      .rejects.toThrow(/cannot insert multiple commands into a prepared statement/);
    expect((await db.query("select to_regclass('public.draft_posts') as name")).rows)
      .toEqual([{ name: null }]);
  } finally { await db.close(); }
}, 30000);

it("initializes the complete schema through one prepared statement and preserves private permissions", async () => {
  const db = new PGlite();
  try {
    await db.exec(roles);
    const setup = await sql("setup/query-bootstrap.sql");
    await db.query(setup);
    expect((await db.query("select table_name,column_name from information_schema.columns where table_schema='public' and column_name in ('status','original_name') order by table_name,column_name")).rows)
      .toEqual([
        { table_name: "draft_posts", column_name: "status" },
        { table_name: "media", column_name: "original_name" },
        { table_name: "media", column_name: "status" },
      ]);
    expect((await db.query("select has_table_privilege('anon','public.draft_posts','select') as private_read, has_table_privilege('anon','public.published_posts','select') as public_read, has_function_privilege('anon','public.delete_post(uuid,uuid,bigint)','execute') as public_delete, has_function_privilege('service_role','public.delete_post(uuid,uuid,bigint)','execute') as service_delete")).rows)
      .toEqual([{ private_read: false, public_read: true, public_delete: false, service_delete: true }]);
    await db.query("insert into public.draft_posts(draft,owner_id) values('{}','11111111-1111-4111-8111-111111111111')");
    await expect(db.query(setup)).rejects.toThrow(/BLOG_TABLES_ALREADY_EXIST/);
    expect((await db.query("select count(*)::int as count from public.draft_posts")).rows)
      .toEqual([{ count: 1 }]);
  } finally { await db.close(); }
}, 30000);

it("upgrades an existing initial schema through one prepared statement", async () => {
  const db = new PGlite();
  try {
    await db.exec(roles);
    await db.exec(await sql("migrations/202610120001_initial.sql"));
    await db.query(await sql("setup/query-maintenance.sql"));
    expect((await db.query("select to_regprocedure('public.delete_post(uuid,uuid,bigint)') is not null as ready")).rows)
      .toEqual([{ ready: true }]);
  } finally { await db.close(); }
}, 30000);

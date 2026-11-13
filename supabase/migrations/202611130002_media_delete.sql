-- Safe, retryable deletion of image objects. Execute as one query after album migrations.
DO $media_delete$
begin
  if to_regclass('public.media') is null or to_regclass('public.draft_posts') is null or to_regclass('public.album_photos') is null then raise exception 'ALBUM_MIGRATION_REQUIRED'; end if;
  alter table public.media drop constraint if exists media_status_check;
  alter table public.media add constraint media_status_check check(status in ('pending','ready','deleting','deleted'));

  create or replace function public.check_draft_media_deletion() returns trigger language plpgsql security invoker set search_path='' as $fn$
  declare key text; old_doc jsonb;
  begin
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.owner_id::text,0));
    old_doc := case when tg_op='UPDATE' then old.draft else '{}'::jsonb end;
    for key in select distinct value #>> '{}' from pg_catalog.jsonb_path_query(new.draft, '$.**.storageKey') as keys(value) union select new.draft->>'coverKey' loop
      if key like 'blob/%' and not pg_catalog.jsonb_path_exists(old_doc, '$.**.storageKey ? (@ == $key)',pg_catalog.jsonb_build_object('key',key)) and coalesce(old_doc->>'coverKey','')<>key then
        if not exists (select 1 from public.media m where m.owner_id=new.owner_id and m.storage_key=key and m.status='ready') then raise exception 'MEDIA_NOT_READY'; end if;
      end if;
    end loop;
    return new;
  end $fn$;
  drop trigger if exists check_draft_media_deletion on public.draft_posts;
  create trigger check_draft_media_deletion before insert or update of draft on public.draft_posts for each row execute function public.check_draft_media_deletion();

  create or replace function public.begin_media_delete(p_owner uuid,p_id uuid,p_revision bigint) returns text language plpgsql security invoker set search_path='' as $fn$
  declare m public.media; current_revision bigint;
  begin
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text,0));
    select * into m from public.media where id=p_id and owner_id=p_owner for update;
    if not found or m.mime_type not like 'image/%' or m.status not in ('ready','deleting') then raise exception 'MEDIA_NOT_FOUND'; end if;
    if pg_catalog.lower(m.storage_key) not in ('blob/'||pg_catalog.lower(p_owner::text)||'/'||pg_catalog.lower(p_id::text)||'.jpg','blob/'||pg_catalog.lower(p_owner::text)||'/'||pg_catalog.lower(p_id::text)||'.png','blob/'||pg_catalog.lower(p_owner::text)||'/'||pg_catalog.lower(p_id::text)||'.webp','blob/'||pg_catalog.lower(p_owner::text)||'/'||pg_catalog.lower(p_id::text)||'.gif') then raise exception 'MEDIA_KEY_INVALID'; end if;
    select revision into current_revision from public.album_photos where owner_id=p_owner and media_id=m.id for update;
    if current_revision is distinct from p_revision then raise exception 'ALBUM_CONFLICT'; end if;
    if m.status='ready' then
      if exists (select 1 from public.draft_posts d where (d.draft->>'coverKey'=m.storage_key or pg_catalog.jsonb_path_exists(d.draft,'$.**.storageKey ? (@ == $key)',pg_catalog.jsonb_build_object('key',m.storage_key)) or pg_catalog.jsonb_path_exists(d.draft,'$.**.mediaId ? (@ == $id)',pg_catalog.jsonb_build_object('id',m.id::text))))
      or exists (select 1 from public.published_posts p where (p.draft->>'coverKey'=m.storage_key or pg_catalog.jsonb_path_exists(p.draft,'$.**.storageKey ? (@ == $key)',pg_catalog.jsonb_build_object('key',m.storage_key)) or pg_catalog.jsonb_path_exists(p.draft,'$.**.mediaId ? (@ == $id)',pg_catalog.jsonb_build_object('id',m.id::text)))) then raise exception 'MEDIA_IN_USE'; end if;
      update public.media set status='deleting' where id=m.id;
      delete from public.published_album_photos where id in (select id from public.album_photos where owner_id=p_owner and media_id=m.id);
      update public.album_photos set published=false,revision=revision+1,updated_at=clock_timestamp() where owner_id=p_owner and media_id=m.id;
    end if;
    return m.storage_key;
  end $fn$;
  create or replace function public.finish_media_delete(p_owner uuid,p_id uuid) returns uuid language plpgsql security invoker set search_path='' as $fn$
  begin
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text,0));
    if not exists(select 1 from public.media where id=p_id and owner_id=p_owner and status in ('deleting','deleted')) then raise exception 'MEDIA_NOT_FOUND'; end if;
    delete from public.album_photos where owner_id=p_owner and media_id=p_id;
    update public.media set status='deleted' where id=p_id and owner_id=p_owner;
    return p_id;
  end $fn$;
  revoke all on function public.check_draft_media_deletion(),public.begin_media_delete(uuid,uuid,bigint),public.finish_media_delete(uuid,uuid) from public,anon,authenticated;
  grant execute on function public.check_draft_media_deletion(),public.begin_media_delete(uuid,uuid,bigint),public.finish_media_delete(uuid,uuid) to service_role;
end
$media_delete$;

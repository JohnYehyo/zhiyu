-- Additive upgrade of the existing independent album. Execute the whole file as ONE query.
-- Safe to repeat; never recreates album/media tables or publishes private photographs.
DO $album_collections$
begin
 if to_regclass('public.album_photos') is null or to_regclass('public.published_album_photos') is null then
   raise exception 'ALBUM_MIGRATION_REQUIRED';
 end if;
 create table if not exists public.album_collections (
   id uuid primary key default gen_random_uuid(),
   owner_id uuid not null,
   title text not null check(char_length(title)<=100 and char_length(btrim(title))>=1),
   description text not null default '' check(char_length(description)<=1000),
   revision bigint not null default 1 check(revision>0 and revision<=9007199254740991),
   created_at timestamptz not null default clock_timestamp(),
   updated_at timestamptz not null default clock_timestamp(),
   unique(id,owner_id)
 );
 create index if not exists album_collections_owner_updated on public.album_collections(owner_id,updated_at desc,id);
 alter table public.album_collections enable row level security;
 revoke all on public.album_collections from public,anon,authenticated;
 grant all on public.album_collections to service_role;
 alter table public.album_photos add column if not exists collection_id uuid;
 if not exists(select 1 from pg_constraint where conname='album_photos_collection_owner_fkey' and conrelid='public.album_photos'::regclass) then
   alter table public.album_photos add constraint album_photos_collection_owner_fkey foreign key(collection_id,owner_id) references public.album_collections(id,owner_id);
 end if;
 create index if not exists album_photos_owner_collection_updated on public.album_photos(owner_id,collection_id,updated_at desc,id);
 alter table public.published_album_photos add column if not exists collection_id uuid;
 alter table public.published_album_photos add column if not exists collection_title text not null default '';
 alter table public.published_album_photos add column if not exists collection_description text not null default '';
 -- Public metadata comes exclusively from published snapshots; private collection rows are never joined here.
 create or replace view public.published_album_collections with (security_invoker=true) as
 select collection_id,
   case when collection_id is null then '未分组' else max(collection_title) end as title,
   case when collection_id is null then '' else max(collection_description) end as description,
   count(*)::integer as photo_count,
   (array_agg(storage_key order by sort_date desc,published_at desc,id desc))[1] as cover_storage_key
 from public.published_album_photos group by collection_id;
 revoke all on public.published_album_collections from public,anon,authenticated;
 grant select on public.published_album_collections to anon,authenticated,service_role;

 create or replace function public.list_album_collections(p_owner uuid)
 returns jsonb language sql security invoker set search_path='' as $$
   select coalesce(jsonb_agg(to_jsonb(c) || jsonb_build_object('photo_count',(select count(*) from public.album_photos p where p.collection_id=c.id and p.owner_id=p_owner)) order by c.updated_at desc,c.id),'[]'::jsonb)
   from public.album_collections c where c.owner_id=p_owner
 $$;
 create or replace function public.create_album_collection(p_owner uuid,p_title text,p_description text)
 returns jsonb language plpgsql security invoker set search_path='' as $$
 declare collection public.album_collections;
 begin
   perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text,0));
   insert into public.album_collections(owner_id,title,description) values(p_owner,p_title,p_description) returning * into collection;
   return to_jsonb(collection) || jsonb_build_object('photo_count',0);
 end $$;
 create or replace function public.update_album_collection(p_id uuid,p_owner uuid,p_revision bigint,p_title text,p_description text)
 returns jsonb language plpgsql security invoker set search_path='' as $$
 declare collection public.album_collections; photo_count bigint;
 begin
   perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text,0));
   select * into collection from public.album_collections where id=p_id and owner_id=p_owner for update;
   if not found then raise exception 'COLLECTION_NOT_FOUND'; end if;
   if collection.revision is distinct from p_revision then raise exception 'COLLECTION_CONFLICT'; end if;
   update public.album_collections set title=p_title,description=p_description,revision=revision+1,updated_at=clock_timestamp() where id=p_id returning * into collection;
   update public.published_album_photos set collection_title=collection.title,collection_description=collection.description where collection_id=p_id;
   select count(*) into photo_count from public.album_photos where collection_id=p_id and owner_id=p_owner;
   return to_jsonb(collection) || jsonb_build_object('photo_count',photo_count);
 end $$;
 create or replace function public.remove_album_collection(p_id uuid,p_owner uuid,p_revision bigint)
 returns uuid language plpgsql security invoker set search_path='' as $$
 declare collection public.album_collections;
 begin
   perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text,0));
   select * into collection from public.album_collections where id=p_id and owner_id=p_owner for update;
   if not found then raise exception 'COLLECTION_NOT_FOUND'; end if;
   if collection.revision is distinct from p_revision then raise exception 'COLLECTION_CONFLICT'; end if;
   update public.album_photos set collection_id=null,revision=revision+1,updated_at=clock_timestamp() where collection_id=p_id and owner_id=p_owner;
   update public.published_album_photos set collection_id=null,collection_title='',collection_description='' where collection_id=p_id;
   delete from public.album_collections where id=p_id and owner_id=p_owner;
   return p_id;
 end $$;

 create or replace function public.create_album_photo(p_owner uuid,p_media_id uuid,p_caption text,p_alt text,p_taken_on text,p_collection_id uuid)
 returns jsonb language plpgsql security invoker set search_path='' as $$
 declare photo public.album_photos; source public.media;
 begin
   perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text,0));
   if p_collection_id is not null then
     perform 1 from public.album_collections where id=p_collection_id and owner_id=p_owner for share;
     if not found then raise exception 'COLLECTION_NOT_FOUND'; end if;
   end if;
   select * into source from public.media where id=p_media_id and owner_id=p_owner and status='ready' and mime_type like 'image/%' for share;
   if not found then raise exception 'MEDIA_NOT_READY'; end if;
   begin
     insert into public.album_photos(owner_id,media_id,storage_key,caption,alt,taken_on,collection_id)
     values(p_owner,p_media_id,source.storage_key,p_caption,p_alt,p_taken_on,p_collection_id) returning * into photo;
   exception when unique_violation then raise exception 'ALBUM_DUPLICATE'; end;
   return to_jsonb(photo);
 end $$;
 create or replace function public.create_album_photo(p_owner uuid,p_media_id uuid,p_caption text,p_alt text,p_taken_on text)
 returns jsonb language sql security invoker set search_path='' as $$
   select public.create_album_photo(p_owner,p_media_id,p_caption,p_alt,p_taken_on,null)
 $$;
 create or replace function public.update_album_photo(p_id uuid,p_owner uuid,p_revision bigint,p_caption text,p_alt text,p_taken_on text,p_published boolean,p_collection_id uuid)
 returns jsonb language plpgsql security invoker set search_path='' as $$
 declare photo public.album_photos; source public.media; collection public.album_collections; published_time timestamptz:=clock_timestamp();
 begin
   -- A shared owner lock makes photo moves and collection rename/delete serialize in a stable order.
   perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text,0));
   select * into photo from public.album_photos where id=p_id and owner_id=p_owner for update;
   if not found then raise exception 'NOT_FOUND'; end if;
   if photo.revision is distinct from p_revision then raise exception 'ALBUM_CONFLICT'; end if;
   if p_collection_id is not null then
     select * into collection from public.album_collections where id=p_collection_id and owner_id=p_owner for share;
     if not found then raise exception 'COLLECTION_NOT_FOUND'; end if;
   end if;
   if p_published then
     select * into source from public.media where id=photo.media_id and owner_id=p_owner and status='ready' and mime_type like 'image/%' for share;
     if not found or source.storage_key is distinct from photo.storage_key then raise exception 'MEDIA_NOT_READY'; end if;
   end if;
   update public.album_photos set caption=p_caption,alt=p_alt,taken_on=p_taken_on,published=p_published,collection_id=p_collection_id,
     revision=revision+1,updated_at=clock_timestamp() where id=p_id returning * into photo;
   if p_published then
     insert into public.published_album_photos(id,storage_key,caption,alt,taken_on,sort_date,published_at,collection_id,collection_title,collection_description)
     values(photo.id,source.storage_key,photo.caption,photo.alt,photo.taken_on,coalesce(nullif(photo.taken_on,''),to_char(photo.created_at at time zone 'UTC','YYYY-MM-DD')),published_time,p_collection_id,coalesce(collection.title,''),coalesce(collection.description,''))
     on conflict(id) do update set storage_key=excluded.storage_key,caption=excluded.caption,alt=excluded.alt,taken_on=excluded.taken_on,sort_date=excluded.sort_date,published_at=excluded.published_at,collection_id=excluded.collection_id,collection_title=excluded.collection_title,collection_description=excluded.collection_description;
   else delete from public.published_album_photos where id=p_id; end if;
   return to_jsonb(photo);
 end $$;
 create or replace function public.update_album_photo(p_id uuid,p_owner uuid,p_revision bigint,p_caption text,p_alt text,p_taken_on text,p_published boolean)
 returns jsonb language plpgsql security invoker set search_path='' as $$
 declare current_collection uuid;
 begin
   perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text,0));
   select collection_id into current_collection from public.album_photos where id=p_id and owner_id=p_owner;
   return public.update_album_photo(p_id,p_owner,p_revision,p_caption,p_alt,p_taken_on,p_published,current_collection);
 end $$;
 revoke all on function public.list_album_collections(uuid),public.create_album_collection(uuid,text,text),public.update_album_collection(uuid,uuid,bigint,text,text),public.remove_album_collection(uuid,uuid,bigint),public.create_album_photo(uuid,uuid,text,text,text,uuid),public.update_album_photo(uuid,uuid,bigint,text,text,text,boolean,uuid),public.create_album_photo(uuid,uuid,text,text,text),public.update_album_photo(uuid,uuid,bigint,text,text,text,boolean) from public,anon,authenticated;
 grant execute on function public.list_album_collections(uuid),public.create_album_collection(uuid,text,text),public.update_album_collection(uuid,uuid,bigint,text,text),public.remove_album_collection(uuid,uuid,bigint),public.create_album_photo(uuid,uuid,text,text,text,uuid),public.update_album_photo(uuid,uuid,bigint,text,text,text,boolean,uuid),public.create_album_photo(uuid,uuid,text,text,text),public.update_album_photo(uuid,uuid,bigint,text,text,text,boolean) to service_role;
end
$album_collections$;

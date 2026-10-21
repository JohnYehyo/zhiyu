-- Additive upgrade after album collections. Execute the whole file as ONE query.
-- Safe to repeat; selection changes never publish private photographs.
DO $album_covers$
begin
 if to_regclass('public.album_collections') is null or to_regclass('public.published_album_collections') is null then
   raise exception 'ALBUM_MIGRATION_REQUIRED';
 end if;
 alter table public.published_album_photos add column if not exists is_collection_cover boolean not null default false;
 create unique index if not exists album_one_collection_cover on public.published_album_photos(collection_id) where is_collection_cover and collection_id is not null;

 -- Moving a snapshot must not carry a cover choice into another collection or unassigned.
 create or replace function public.clear_moved_album_cover()
 returns trigger language plpgsql security invoker set search_path='' as $$
 begin
   if new.collection_id is distinct from old.collection_id then new.is_collection_cover := false; end if;
   return new;
 end $$;
 drop trigger if exists album_clear_moved_cover on public.published_album_photos;
 create trigger album_clear_moved_cover before update of collection_id on public.published_album_photos
 for each row execute function public.clear_moved_album_cover();

 -- The view continues to read only public snapshots, with the same columns and permissions.
 create or replace view public.published_album_collections with (security_invoker=true) as
 select collection_id,
   case when collection_id is null then '未分组' else max(collection_title) end as title,
   case when collection_id is null then '' else max(collection_description) end as description,
   count(*)::integer as photo_count,
   (array_agg(storage_key order by is_collection_cover desc,sort_date desc,published_at desc,id desc))[1] as cover_storage_key
 from public.published_album_photos group by collection_id;
 revoke all on public.published_album_collections from public,anon,authenticated;
 grant select on public.published_album_collections to anon,authenticated,service_role;

 create or replace function public.list_album_collections(p_owner uuid)
 returns jsonb language sql security invoker set search_path='' as $$
   select coalesce(jsonb_agg(to_jsonb(c) || jsonb_build_object(
     'photo_count',(select count(*) from public.album_photos p where p.collection_id=c.id and p.owner_id=p_owner),
     'cover_photo_id',(select p.id from public.published_album_photos p where p.collection_id=c.id and p.is_collection_cover)
   ) order by c.updated_at desc,c.id),'[]'::jsonb)
   from public.album_collections c where c.owner_id=p_owner
 $$;
 create or replace function public.update_album_collection(p_id uuid,p_owner uuid,p_revision bigint,p_title text,p_description text)
 returns jsonb language plpgsql security invoker set search_path='' as $$
 declare collection public.album_collections; photo_count bigint; cover_photo_id uuid;
 begin
   perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text,0));
   select * into collection from public.album_collections where id=p_id and owner_id=p_owner for update;
   if not found then raise exception 'COLLECTION_NOT_FOUND'; end if;
   if collection.revision is distinct from p_revision then raise exception 'COLLECTION_CONFLICT'; end if;
   update public.album_collections set title=p_title,description=p_description,revision=revision+1,updated_at=clock_timestamp() where id=p_id returning * into collection;
   update public.published_album_photos set collection_title=collection.title,collection_description=collection.description where collection_id=p_id;
   select count(*) into photo_count from public.album_photos where collection_id=p_id and owner_id=p_owner;
   select id into cover_photo_id from public.published_album_photos where collection_id=p_id and is_collection_cover;
   return to_jsonb(collection) || jsonb_build_object('photo_count',photo_count,'cover_photo_id',cover_photo_id);
 end $$;
 create or replace function public.set_album_collection_cover(p_id uuid,p_owner uuid,p_revision bigint,p_photo_id uuid)
 returns jsonb language plpgsql security invoker set search_path='' as $$
 declare collection public.album_collections; photo_count bigint;
 begin
   -- Match the owner lock used by collection edits and photo moves/publication.
   perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text,0));
   select * into collection from public.album_collections where id=p_id and owner_id=p_owner for update;
   if not found then raise exception 'COLLECTION_NOT_FOUND'; end if;
   if collection.revision is distinct from p_revision then raise exception 'COLLECTION_CONFLICT'; end if;
   if p_photo_id is not null then
     perform 1 from public.album_photos p
       join public.media m on m.id=p.media_id and m.owner_id=p_owner and m.status='ready' and m.mime_type like 'image/%' and m.storage_key=p.storage_key
       join public.published_album_photos s on s.id=p.id and s.collection_id=p_id and s.storage_key=p.storage_key
       where p.id=p_photo_id and p.owner_id=p_owner and p.collection_id=p_id and p.published
       for share of p,m,s;
     if not found then raise exception 'ALBUM_COVER_INVALID'; end if;
   end if;
   update public.published_album_photos set is_collection_cover=false where collection_id=p_id and is_collection_cover;
   if p_photo_id is not null then update public.published_album_photos set is_collection_cover=true where id=p_photo_id; end if;
   update public.album_collections set revision=revision+1,updated_at=clock_timestamp() where id=p_id returning * into collection;
   select count(*) into photo_count from public.album_photos where collection_id=p_id and owner_id=p_owner;
   return to_jsonb(collection) || jsonb_build_object('photo_count',photo_count,'cover_photo_id',p_photo_id);
 end $$;
 revoke all on function public.clear_moved_album_cover(),public.list_album_collections(uuid),public.update_album_collection(uuid,uuid,bigint,text,text),public.set_album_collection_cover(uuid,uuid,bigint,uuid) from public,anon,authenticated;
 grant execute on function public.clear_moved_album_cover(),public.list_album_collections(uuid),public.update_album_collection(uuid,uuid,bigint,text,text),public.set_album_collection_cover(uuid,uuid,bigint,uuid) to service_role;
end
$album_covers$;

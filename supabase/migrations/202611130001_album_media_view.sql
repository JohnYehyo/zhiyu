-- Read-only union of album photos and ready image media that have no album record.
-- Run as a single query after the album collections migration.
DO $album_media_view$
begin
  if to_regclass('public.album_photos') is null or to_regclass('public.media') is null then
    raise exception 'ALBUM_MIGRATION_REQUIRED';
  end if;
  create or replace view public.admin_album_photo_inventory with (security_invoker=true) as
    select p.id,p.owner_id,p.media_id,p.collection_id,p.storage_key,p.caption,p.alt,p.taken_on,
      p.revision,p.published,p.created_at,p.updated_at,false as media_only,(m.status='deleting') as deletion_pending,m.original_name as filename
    from public.album_photos p join public.media m on m.id=p.media_id and m.owner_id=p.owner_id
    union all
    select m.id,m.owner_id,m.id as media_id,null::uuid as collection_id,m.storage_key,
      ''::text as caption,''::text as alt,''::text as taken_on,0::bigint as revision,
      false as published,m.created_at,m.created_at as updated_at,true as media_only,(m.status='deleting') as deletion_pending,m.original_name as filename
    from public.media m
    where m.status in ('ready','deleting') and m.mime_type like 'image/%'
      and not exists (select 1 from public.album_photos p where p.owner_id=m.owner_id and p.media_id=m.id);
  revoke all on public.admin_album_photo_inventory from public,anon,authenticated;
  grant select on public.admin_album_photo_inventory to service_role;
end
$album_media_view$;

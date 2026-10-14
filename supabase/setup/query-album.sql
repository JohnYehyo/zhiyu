-- Existing media schema required. Execute this complete file as ONE prepared query.
-- This additive migration deliberately rejects reinitialization rather than replacing data.
DO $blog_album$
begin
 if to_regclass('public.media') is null then raise exception 'ALBUM_MEDIA_REQUIRED'; end if;
 if to_regclass('public.album_photos') is not null or to_regclass('public.published_album_photos') is not null then
   raise exception 'ALBUM_ALREADY_INITIALIZED';
 end if;

create table public.album_photos (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null,
 media_id uuid not null references public.media(id),
 storage_key text not null,
 caption text not null default '' check(char_length(caption)<=1000),
 alt text not null default '' check(char_length(alt)<=500),
 taken_on text not null default '' check(
   case when taken_on='' then true
   when taken_on ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' and left(taken_on,4)<>'0000'
   then to_char(to_date(taken_on,'YYYY-MM-DD'),'YYYY-MM-DD')=taken_on else false end
 ),
 revision bigint not null default 1 check(revision>0 and revision<=9007199254740991),
 published boolean not null default false,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 unique(owner_id,media_id)
);
create index album_photos_owner_updated on public.album_photos(owner_id,updated_at desc,id);
create table public.published_album_photos (
 id uuid primary key references public.album_photos(id) on delete cascade,
 storage_key text not null,
 caption text not null,
 alt text not null,
 taken_on text not null default '',
 sort_date text not null,
 published_at timestamptz not null
);
create index album_published_sort on public.published_album_photos(sort_date desc,published_at desc,id desc);
alter table public.album_photos enable row level security;
alter table public.published_album_photos enable row level security;
revoke all on public.album_photos,public.published_album_photos from public,anon,authenticated;
grant all on public.album_photos,public.published_album_photos to service_role;
grant select on public.published_album_photos to anon,authenticated;
create policy album_published_read on public.published_album_photos for select to anon,authenticated using(true);

create function public.create_album_photo(p_owner uuid,p_media_id uuid,p_caption text,p_alt text,p_taken_on text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare photo public.album_photos; source public.media;
begin
 select * into source from public.media where id=p_media_id and owner_id=p_owner and status='ready' and mime_type like 'image/%' for share;
 if not found then raise exception 'MEDIA_NOT_READY'; end if;
 begin
   insert into public.album_photos(owner_id,media_id,storage_key,caption,alt,taken_on)
   values(p_owner,p_media_id,source.storage_key,p_caption,p_alt,p_taken_on) returning * into photo;
 exception when unique_violation then raise exception 'ALBUM_DUPLICATE';
 end;
 return to_jsonb(photo);
end $$;

create function public.update_album_photo(p_id uuid,p_owner uuid,p_revision bigint,p_caption text,p_alt text,p_taken_on text,p_published boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare photo public.album_photos; source public.media; published_time timestamptz:=clock_timestamp();
begin
 select * into photo from public.album_photos where id=p_id and owner_id=p_owner for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if photo.revision is distinct from p_revision then raise exception 'ALBUM_CONFLICT'; end if;
 if p_published then
   select * into source from public.media where id=photo.media_id and owner_id=p_owner and status='ready' and mime_type like 'image/%' for share;
   if not found or source.storage_key is distinct from photo.storage_key then raise exception 'MEDIA_NOT_READY'; end if;
 end if;
 update public.album_photos set caption=p_caption,alt=p_alt,taken_on=p_taken_on,published=p_published,
   revision=revision+1,updated_at=clock_timestamp() where id=p_id returning * into photo;
 if p_published then
   insert into public.published_album_photos(id,storage_key,caption,alt,taken_on,sort_date,published_at)
   values(photo.id,source.storage_key,photo.caption,photo.alt,photo.taken_on,coalesce(nullif(photo.taken_on,''),to_char(photo.created_at at time zone 'UTC','YYYY-MM-DD')),published_time)
   on conflict(id) do update set storage_key=excluded.storage_key,caption=excluded.caption,alt=excluded.alt,taken_on=excluded.taken_on,sort_date=excluded.sort_date,published_at=excluded.published_at;
 else
   delete from public.published_album_photos where id=p_id;
 end if;
 return to_jsonb(photo);
end $$;

create function public.remove_album_photo(p_id uuid,p_owner uuid,p_revision bigint)
returns uuid language plpgsql security invoker set search_path='' as $$
declare photo public.album_photos;
begin
 select * into photo from public.album_photos where id=p_id and owner_id=p_owner for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if photo.revision is distinct from p_revision then raise exception 'ALBUM_CONFLICT'; end if;
 delete from public.album_photos where id=p_id;
 return p_id;
end $$;
revoke all on function public.create_album_photo(uuid,uuid,text,text,text),public.update_album_photo(uuid,uuid,bigint,text,text,text,boolean),public.remove_album_photo(uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.create_album_photo(uuid,uuid,text,text,text),public.update_album_photo(uuid,uuid,bigint,text,text,text,boolean),public.remove_album_photo(uuid,uuid,bigint) to service_role;
end
$blog_album$;

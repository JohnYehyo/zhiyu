-- Empty blog schema only. Paste this entire file as ONE query. Includes both migrations.
-- Atomic: any error rolls back the whole setup. Existing blog tables cause an error.
DO $blog_setup$
BEGIN
if to_regclass('public.draft_posts') is not null
   or to_regclass('public.published_posts') is not null
   or to_regclass('public.media') is not null then
  raise exception 'BLOG_TABLES_ALREADY_EXIST: stop and inspect existing blog tables; do not rerun bootstrap';
end if;

create table public.draft_posts (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null,
  revision bigint not null default 1 check (revision > 0), draft jsonb not null check (jsonb_typeof(draft)='object'),
  published_revision bigint, published_at timestamptz, updated_at timestamptz not null default now()
);
create index draft_posts_owner_updated on public.draft_posts(owner_id,updated_at desc);
create table public.published_posts (
  id uuid primary key references public.draft_posts(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  draft jsonb not null, published_at timestamptz not null
);
create table public.media (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null,
  storage_key text not null unique check (storage_key ~ '^blob/[a-fA-F0-9-]{36}/[a-fA-F0-9-]{36}\.(jpg|png|webp|gif|mp4|webm|mov)$'),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime')),
  size bigint not null check (size>0 and size<=209715200 and (mime_type not like 'image/%' or size<=20971520)),
  status text not null default 'pending' check(status in ('pending','ready')), created_at timestamptz not null default now()
);
create index media_owner on public.media(owner_id);
alter table public.draft_posts enable row level security;
alter table public.media enable row level security;
alter table public.published_posts enable row level security;
revoke all on public.draft_posts,public.media,public.published_posts from public,anon,authenticated;
grant all on public.draft_posts,public.media,public.published_posts to service_role;
grant select on public.published_posts to anon,authenticated;
create policy published_read on public.published_posts for select to anon,authenticated using (true);

-- Invoker functions: only service_role receives EXECUTE; never bypass RLS via definer.
create function public.save_draft(p_id uuid,p_owner uuid,p_revision bigint,p_draft jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare post public.draft_posts;
begin
 select * into post from public.draft_posts where id=p_id and owner_id=p_owner for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if post.revision<>p_revision then raise exception 'REVISION_CONFLICT'; end if;
 update public.draft_posts set draft=p_draft,revision=revision+1,updated_at=clock_timestamp() where id=p_id returning * into post;
 return to_jsonb(post);
end $$;

-- Remove editor-only URLs recursively, retaining only verified keys on media nodes.
create function public.snapshot_node(p_node jsonb,p_owner uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb:=p_node; item jsonb; children jsonb:='[]'; found_media public.media;
begin
 if p_node->>'type' in ('image','video') then
   select * into found_media from public.media where id=(p_node#>>'{attrs,mediaId}')::uuid and owner_id=p_owner and status='ready' for share;
   if not found or found_media.storage_key is distinct from p_node#>>'{attrs,storageKey}'
      or (p_node->>'type'='image' and found_media.mime_type not like 'image/%')
      or (p_node->>'type'='video' and found_media.mime_type not like 'video/%') then raise exception 'MEDIA_NOT_READY'; end if;
   result:=jsonb_set(result,'{attrs}',(coalesce(result->'attrs','{}')-'src'-'poster') || jsonb_build_object('storageKey',found_media.storage_key));
 end if;
 if jsonb_typeof(p_node->'content')='array' then
   for item in select value from jsonb_array_elements(p_node->'content') loop children:=children || jsonb_build_array(public.snapshot_node(item,p_owner)); end loop;
   result:=jsonb_set(result,'{content}',children);
 end if;
 return result;
end $$;
create function public.publish_post(p_id uuid,p_owner uuid,p_revision bigint) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare post public.draft_posts; snapshot jsonb; cover public.media; published_time timestamptz:=clock_timestamp();
begin
 select * into post from public.draft_posts where id=p_id and owner_id=p_owner for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if post.revision<>p_revision then raise exception 'REVISION_CONFLICT'; end if;
 snapshot:=jsonb_set(post.draft,'{content}',public.snapshot_node(post.draft->'content',p_owner));
 if coalesce(post.draft->>'coverKey','')<>'' then
   select * into cover from public.media where storage_key=post.draft->>'coverKey' and owner_id=p_owner and status='ready' and mime_type like 'image/%' for share;
   if not found then raise exception 'MEDIA_NOT_READY'; end if;
   snapshot:=jsonb_set(snapshot,'{coverKey}',to_jsonb(cover.storage_key));
 end if;
 insert into public.published_posts(id,slug,draft,published_at) values(p_id,snapshot->>'slug',snapshot,published_time)
 on conflict(id) do update set slug=excluded.slug,draft=excluded.draft,published_at=excluded.published_at;
 update public.draft_posts set published_revision=revision,published_at=published_time where id=p_id returning * into post;
 return to_jsonb(post);
end $$;
create function public.unpublish_post(p_id uuid,p_owner uuid,p_revision bigint) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare post public.draft_posts;
begin
 select * into post from public.draft_posts where id=p_id and owner_id=p_owner for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if post.revision<>p_revision then raise exception 'REVISION_CONFLICT'; end if;
 delete from public.published_posts where id=p_id;
 update public.draft_posts set published_revision=null,published_at=null where id=p_id returning * into post;
 return to_jsonb(post);
end $$;
revoke all on function public.save_draft(uuid,uuid,bigint,jsonb),public.snapshot_node(jsonb,uuid),public.publish_post(uuid,uuid,bigint),public.unpublish_post(uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.save_draft(uuid,uuid,bigint,jsonb),public.snapshot_node(jsonb,uuid),public.publish_post(uuid,uuid,bigint),public.unpublish_post(uuid,uuid,bigint) to service_role;

alter table public.draft_posts add column status text generated always as (
  case when published_revision is null then 'draft'
       when published_revision = revision then 'published'
       else 'changed' end
) stored;
create index draft_posts_owner_status_updated
  on public.draft_posts(owner_id, status, updated_at desc, id);

alter table public.media add column original_name text
  check (original_name is null or length(original_name) between 1 and 255);
create index media_owner_ready_created
  on public.media(owner_id, status, created_at desc, id);

-- Cascade removes the public snapshot. Shared R2 objects and media remain intact.
create function public.delete_post(p_id uuid, p_owner uuid, p_revision bigint)
returns uuid language plpgsql security invoker set search_path='' as $$
declare post public.draft_posts;
begin
  select * into post from public.draft_posts
    where id=p_id and owner_id=p_owner for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if p_revision is null or post.revision<>p_revision then
    raise exception 'REVISION_CONFLICT';
  end if;
  delete from public.draft_posts where id=p_id and owner_id=p_owner;
  return p_id;
end $$;
revoke all on function public.delete_post(uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.delete_post(uuid,uuid,bigint) to service_role;
END
$blog_setup$;

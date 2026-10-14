-- Existing initialized blog schema. Paste this complete file as ONE prepared query.
-- Apply once after initial/bootstrap (maintenance fields are unaffected). Safe to repeat.
DO $blog_journal$
begin
create or replace function public.snapshot_node(p_node jsonb,p_owner uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb:=p_node; item jsonb; children jsonb:='[]'; found_media public.media; storage_key text:=p_node#>>'{attrs,storageKey}';
begin
 if p_node->>'type'='image' and storage_key in (
   '/assets/picnic.svg','/assets/meadow.svg','/assets/flowers.svg',
   '/assets/sea.svg','/assets/window.svg','/assets/sun.svg'
 ) then
   if p_node->'attrs' ? 'mediaId' then raise exception 'MEDIA_NOT_READY'; end if;
   result:=jsonb_set(result,'{attrs}',(result->'attrs')-'src'-'poster');
 elsif p_node->>'type' in ('image','video') then
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
create or replace function public.publish_post(p_id uuid,p_owner uuid,p_revision bigint) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare post public.draft_posts; snapshot jsonb; cover public.media; published_time timestamptz:=clock_timestamp();
begin
 select * into post from public.draft_posts where id=p_id and owner_id=p_owner for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if post.revision<>p_revision then raise exception 'REVISION_CONFLICT'; end if;
 snapshot:=jsonb_set(post.draft,'{content}',public.snapshot_node(post.draft->'content',p_owner));
 if coalesce(post.draft->>'coverKey','')<>'' and post.draft->>'coverKey' not in (
   '/assets/picnic.svg','/assets/meadow.svg','/assets/flowers.svg',
   '/assets/sea.svg','/assets/window.svg','/assets/sun.svg'
 ) then
   select * into cover from public.media where storage_key=post.draft->>'coverKey' and owner_id=p_owner and status='ready' and mime_type like 'image/%' for share;
   if not found then raise exception 'MEDIA_NOT_READY'; end if;
   snapshot:=jsonb_set(snapshot,'{coverKey}',to_jsonb(cover.storage_key));
 end if;
 insert into public.published_posts(id,slug,draft,published_at) values(p_id,snapshot->>'slug',snapshot,published_time)
 on conflict(id) do update set slug=excluded.slug,draft=excluded.draft,published_at=excluded.published_at;
 update public.draft_posts set published_revision=revision,published_at=published_time where id=p_id returning * into post;
 return to_jsonb(post);
end $$;
revoke all on function public.snapshot_node(jsonb,uuid),public.publish_post(uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.snapshot_node(jsonb,uuid),public.publish_post(uuid,uuid,bigint) to service_role;
end
$blog_journal$;

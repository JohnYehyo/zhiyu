-- Existing initial schema only. Paste this entire file as ONE query. Run once.
-- Do not run after query-bootstrap.sql, which already includes these changes.
DO $blog_maintenance$
BEGIN
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
$blog_maintenance$;

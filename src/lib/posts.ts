import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Article, PostDraft } from "./types";
import { demoPosts } from "./demo-posts";
import {
  hasSupabaseConfig,
  publicSupabaseKey,
  publicSupabaseUrl,
} from "./config";
import { normalizeDocument } from "./content/document";
interface PublishedRow {
  id: string;
  slug: string;
  draft: PostDraft;
  published_at: string;
}
function reader() {
  return createClient(publicSupabaseUrl(), publicSupabaseKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
function article(row: PublishedRow): Article {
  return {
    ...row.draft,
    id: row.id,
    slug: row.slug,
    content: normalizeDocument(row.draft.content),
    publishedAt: row.published_at,
  };
}
export async function getPublishedPosts(): Promise<Article[]> {
  if (!hasSupabaseConfig()) return demoPosts;
  const { data, error } = await reader()
    .from("published_posts")
    .select("id,slug,draft,published_at")
    .order("published_at", { ascending: false });
  if (error) throw new Error("公开文章读取失败，请稍后重试。");
  return (data as PublishedRow[]).map(article);
}
export async function getPublishedPost(slug: string): Promise<Article | null> {
  if (!hasSupabaseConfig())
    return demoPosts.find((post) => post.slug === slug) ?? null;
  const { data, error } = await reader()
    .from("published_posts")
    .select("id,slug,draft,published_at")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error("公开文章读取失败，请稍后重试。");
  return data ? article(data as PublishedRow) : null;
}

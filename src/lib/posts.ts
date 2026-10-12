import type { Article } from "./types";
import { demoPosts } from "./demo-posts";

// Task 2 replaces this sample-only adapter with the configured cloud reader.
export async function getPublishedPosts(): Promise<Article[]> { return demoPosts; }
export async function getPublishedPost(slug: string): Promise<Article | null> {
  return demoPosts.find((post) => post.slug === slug) ?? null;
}

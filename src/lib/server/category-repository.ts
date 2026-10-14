import "server-only";
import { getServiceSupabase } from "../supabase/service";
import { databaseError } from "./repository";

const pageSize = 500;
const maxPages = 10;

export async function listCategories(owner: string): Promise<string[]> {
  const client = getServiceSupabase();
  const categories = new Set<string>();
  // Category suggestions cover the first 5,000 owned drafts without loading
  // private article contents or allowing an unbounded scan on each editor visit.
  for (let page = 0; page < maxPages; page++) {
    const start = page * pageSize;
    const { data, error } = await client
      .from("draft_posts")
      .select("category:draft->>category")
      .eq("owner_id", owner)
      .order("id")
      .range(start, start + pageSize - 1);
    if (error?.code === "PGRST103" && page > 0) break;
    if (error) databaseError(error);
    if (!Array.isArray(data)) databaseError({ message: "Invalid category response" });
    for (const row of data) {
      const value = row?.category;
      if (typeof value !== "string") continue;
      const category = value.trim();
      if (category && category.length <= 60) categories.add(category);
    }
    if (data.length < pageSize) break;
  }
  return [...categories].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

"use client";
import { createBrowserClient } from "@supabase/ssr";
import { hasSupabaseConfig, publicSupabaseKey } from "../config";
export function getBrowserSupabase() {
  if (!hasSupabaseConfig()) return null;
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    publicSupabaseKey(),
  );
}

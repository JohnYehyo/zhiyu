"use client";
import { createBrowserClient } from "@supabase/ssr";
import {
  hasSupabaseConfig,
  publicSupabaseKey,
  publicSupabaseUrl,
} from "../config";
export function getBrowserSupabase() {
  if (!hasSupabaseConfig()) return null;
  return createBrowserClient(publicSupabaseUrl(), publicSupabaseKey());
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars",
  );
}

export function getServerSupabase(): SupabaseClient {
  return createClient(url!, anonKey!, {
    auth: { persistSession: false },
  });
}

let _browser: SupabaseClient | null = null;
export function getBrowserSupabase(): SupabaseClient {
  if (!_browser) _browser = createClient(url!, anonKey!);
  return _browser;
}

export type Building = {
  id: string;
  address: string;
  lat: number;
  lng: number;
  scan_url: string | null;
  is_demo: boolean;
  created_at: string;
};

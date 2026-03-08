import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export const supabase = createClient(
  supabaseUrl!,
  supabaseKey!,
  {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 20 } },
  }
);

export function isConfigured() {
  return Boolean(supabaseUrl && supabaseKey);
}

// Keep getClient() alias so existing callers work without changes
export function getClient() {
  return supabase;
}

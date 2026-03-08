import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!,
  {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 20 } },
  }
);

// Keep getClient() alias so existing callers work without changes
export function getClient() {
  return supabase;
}

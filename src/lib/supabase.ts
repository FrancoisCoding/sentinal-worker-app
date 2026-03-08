import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

let _client: SupabaseClient | null = null;

/**
 * Initialize (or re-initialize) the Supabase client with new credentials.
 * Called once during app load after reading from SecureStore, and again
 * whenever the user updates credentials in Settings.
 */
export function configure(url: string, key: string): void {
  if (_client) {
    _client.removeAllChannels();
  }
  _client = createClient(url, key, {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 20 } },
  });
}

/**
 * Returns the active Supabase client.
 * Only call this after the connection gate has confirmed credentials exist.
 */
export function getClient(): SupabaseClient {
  if (!_client) throw new Error("Supabase not configured");
  return _client;
}

export function isConfigured(): boolean {
  return _client !== null;
}

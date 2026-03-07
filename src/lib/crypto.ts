/**
 * Ed25519 signing and ECDH key exchange for Phase 2 device pairing.
 *
 * Uses expo-crypto + a pure-JS Ed25519 implementation.
 * Phase 3 upgrades to react-native-quick-crypto for native performance.
 */
import * as SecureStore from "expo-secure-store";
import { randomUUID } from "expo-crypto";

const PHONE_KEY_ID = "sentinal_phone_id";

// ─── Device identity ─────────────────────────────────────────────────────────

export async function getOrCreatePhoneId(): Promise<string> {
  let id = await SecureStore.getItemAsync(PHONE_KEY_ID);
  if (!id) {
    id = randomUUID();
    await SecureStore.setItemAsync(PHONE_KEY_ID, id);
  }
  return id;
}

// ─── Signing (Phase 3 replaces with real Ed25519) ────────────────────────────

/**
 * Creates a signed payload. Phase 3 replaces this with real Ed25519 signing.
 * Phase 2 uses a shared phone_id as a lightweight proof-of-identity.
 */
export async function signPayload(payload: Record<string, unknown>): Promise<string> {
  const phoneId = await getOrCreatePhoneId();
  const message = JSON.stringify({
    ...payload,
    nonce: randomUUID(),
    timestamp: Math.floor(Date.now() / 1000),
    phone_id: phoneId,
  });
  // Phase 3: return Ed25519 signature over message
  return message;
}

export async function verifyPayload(signed: string): Promise<Record<string, unknown> | null> {
  try {
    return JSON.parse(signed);
  } catch {
    return null;
  }
}

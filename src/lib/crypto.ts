/**
 * Phase 3 crypto — real Ed25519 signing with tweetnacl.
 *
 * - Key pairs generated on first launch; private key stored in expo-secure-store.
 * - PRNG is backed by expo-crypto getRandomBytes (CSPRNG).
 * - Every task payload is signed with Ed25519 and includes a nonce + timestamp
 *   so the desktop can reject replays and stale messages.
 */
import * as SecureStore from "expo-secure-store";
import { randomUUID, getRandomBytes } from "expo-crypto";
import nacl from "tweetnacl";
import { encodeBase64, decodeBase64 } from "tweetnacl-util";

// Shim tweetnacl's PRNG to use expo-crypto secure randomness (CSPRNG)
nacl.setPRNG((x: Uint8Array, n: number) => {
  const bytes = getRandomBytes(n);
  for (let i = 0; i < n; i++) x[i] = bytes[i];
});

const PHONE_ID_KEY = "sentinal_phone_id";
const PRIVATE_KEY_KEY = "sentinal_ed25519_private";
const PUBLIC_KEY_KEY = "sentinal_ed25519_public";

// ─── Device identity ─────────────────────────────────────────────────────────

export async function getOrCreatePhoneId(): Promise<string> {
  let id = await SecureStore.getItemAsync(PHONE_ID_KEY);
  if (!id) {
    id = randomUUID();
    await SecureStore.setItemAsync(PHONE_ID_KEY, id);
  }
  return id;
}

// ─── Ed25519 key pair ────────────────────────────────────────────────────────

/**
 * Returns the persistent Ed25519 key pair for this device.
 * Generated once on first call; stored in expo-secure-store.
 *
 * publicKey  — 32 bytes, base64-encoded; shared with desktop during pairing
 * privateKey — 64 bytes (seed || publicKey), base64-encoded; never leaves device
 */
export async function getOrCreateKeyPair(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  const storedPub = await SecureStore.getItemAsync(PUBLIC_KEY_KEY);
  const storedPriv = await SecureStore.getItemAsync(PRIVATE_KEY_KEY);

  if (storedPub && storedPriv) {
    return { publicKey: storedPub, privateKey: storedPriv };
  }

  const keyPair = nacl.sign.keyPair();
  const publicKey = encodeBase64(keyPair.publicKey); // 32 bytes → base64
  const privateKey = encodeBase64(keyPair.secretKey); // 64 bytes → base64

  await SecureStore.setItemAsync(PUBLIC_KEY_KEY, publicKey);
  await SecureStore.setItemAsync(PRIVATE_KEY_KEY, privateKey);

  return { publicKey, privateKey };
}

export async function getPublicKey(): Promise<string> {
  const { publicKey } = await getOrCreateKeyPair();
  return publicKey;
}

// ─── Signing ─────────────────────────────────────────────────────────────────

/** The signed envelope sent to Supabase as `signed_payload`. */
export interface SignedPayload {
  /** JSON string of the payload + nonce + timestamp + phone_id */
  message: string;
  /** Base64 Ed25519 detached signature over message bytes */
  signature: string;
  /** Base64 phone Ed25519 public key (32 bytes) */
  public_key: string;
}

/**
 * Sign an arbitrary payload with the phone's Ed25519 private key.
 *
 * Adds `nonce` (UUID), `timestamp` (Unix seconds), and `phone_id` to the
 * message so the desktop can enforce freshness and reject replays.
 */
export async function signPayload(
  payload: Record<string, unknown>
): Promise<SignedPayload> {
  const phoneId = await getOrCreatePhoneId();
  const { publicKey, privateKey } = await getOrCreateKeyPair();

  const messageObj = {
    ...payload,
    nonce: randomUUID(),
    timestamp: Math.floor(Date.now() / 1000),
    phone_id: phoneId,
  };

  const messageStr = JSON.stringify(messageObj);
  const messageBytes = new TextEncoder().encode(messageStr);
  const privateKeyBytes = decodeBase64(privateKey);

  const signature = nacl.sign.detached(messageBytes, privateKeyBytes);

  return {
    message: messageStr,
    signature: encodeBase64(signature),
    public_key: publicKey,
  };
}

/**
 * Verify a signed payload locally (useful for debugging / self-verification).
 */
export async function verifySignedPayload(signed: SignedPayload): Promise<boolean> {
  try {
    const messageBytes = new TextEncoder().encode(signed.message);
    const sigBytes = decodeBase64(signed.signature);
    const pubKeyBytes = decodeBase64(signed.public_key);
    return nacl.sign.detached.verify(messageBytes, sigBytes, pubKeyBytes);
  } catch {
    return false;
  }
}

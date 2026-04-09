import * as Keychain from 'react-native-keychain';

const SERVICE = 'rn-mobile-security-demo.hmac';

/**
 * In a real app, this would never be embedded in the binary — the client
 * would enroll with the server and receive a per-install secret via
 * attestation. The seed only runs once in __DEV__ so the demo is usable
 * out of the box.
 */
const DEV_SEED = 'dev-secret-do-not-use-in-prod';

let cached: string | null = null;

export async function getHmacSecret(): Promise<string> {
  if (cached !== null) {
    return cached;
  }

  const stored = await Keychain.getGenericPassword({ service: SERVICE });
  if (stored && stored.password.length > 0) {
    cached = stored.password;
    return cached;
  }

  if (!__DEV__) {
    throw new Error('hmac_secret_missing');
  }

  await Keychain.setGenericPassword('hmac', DEV_SEED, { service: SERVICE });
  cached = DEV_SEED;
  return cached;
}

export async function resetHmacSecretForTesting(): Promise<void> {
  cached = null;
  await Keychain.resetGenericPassword({ service: SERVICE });
}

import { NativeModules, Platform } from 'react-native';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { fetch: pinnedFetchJs } = require('react-native-ssl-pinning');

interface NativeRequestOptions {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
}

interface NativeResponse {
  status: number;
  body: string;
}

interface NativeBridge {
  request(opts: NativeRequestOptions): Promise<NativeResponse>;
}

const Native: NativeBridge | undefined = NativeModules.SSLPinningModule;

export interface PinnedResponse {
  status: number;
  text(): Promise<string>;
}

function fromNative(res: NativeResponse): PinnedResponse {
  return { status: res.status, text: async () => res.body };
}

/**
 * Pinned HTTP fetch.
 *
 * Prefers the native module (Swift on iOS, Kotlin on Android). If the
 * native module is unavailable for any reason — for example, a build
 * that didn't link the package — it falls back to the JS-layer
 * react-native-ssl-pinning library, which performs the same SPKI check
 * in JS land. Defense in depth: both layers reject unpinned certs.
 */
export async function pinnedFetch(
  url: string,
  init: { method: string; headers?: Record<string, string>; body?: string }
): Promise<PinnedResponse> {
  if (Native?.request) {
    const res = await Native.request({
      url,
      method: init.method,
      headers: init.headers,
      body: init.body,
    });
    return fromNative(res);
  }

  const certs = Platform.select({
    ios: ['server-cert'],
    android: ['server-cert.cer'],
  });

  const res = await pinnedFetchJs(url, {
    method: init.method,
    headers: init.headers,
    body: init.body,
    sslPinning: { certs },
    timeoutInterval: 10000,
  });

  const text = typeof res.bodyString === 'string' ? res.bodyString : '';
  return { status: res.status, text: async () => text };
}

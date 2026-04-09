import { signRequest } from './signing';
import { getHmacSecret } from './secret';
import { pinnedFetch } from './pinning';

export interface SignedFetchOptions {
  method?: string;
  body?: unknown;
  baseUrl: string;
  path: string;
  /** Override the request body BEFORE signing — used by the attack demo to send a tampered body with a valid signature. */
  tamperedBody?: string;
  /** Skip attaching signature headers entirely — used by the attack demo. */
  unsigned?: boolean;
  /** Override the timestamp going into the signature — used by the attack demo. */
  forcedTimestamp?: string;
}

export interface SignedFetchResult {
  status: number;
  body: unknown;
}

export async function signedFetch(opts: SignedFetchOptions): Promise<SignedFetchResult> {
  const method = (opts.method ?? 'POST').toUpperCase();
  const serializedBody = opts.body === undefined ? '' : JSON.stringify(opts.body);
  const bodyForTransport = opts.tamperedBody ?? serializedBody;

  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };

  if (!opts.unsigned) {
    const secret = await getHmacSecret();
    const signed = signRequest({
      method,
      path: opts.path,
      body: serializedBody,
      secret,
      now: opts.forcedTimestamp ? () => Number(opts.forcedTimestamp) : undefined,
    });
    headers['x-signature'] = signed.signature;
    headers['x-timestamp'] = signed.timestamp;
  }

  const response = await pinnedFetch(`${opts.baseUrl}${opts.path}`, {
    method,
    headers,
    body: method === 'GET' ? undefined : bodyForTransport,
  });

  let parsed: unknown = null;
  const text = await response.text();
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  return { status: response.status, body: parsed };
}

import { createHash, createHmac, timingSafeEqual } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

export type SignatureError =
  | 'missing_headers'
  | 'stale_timestamp'
  | 'bad_signature';

export interface VerifySignatureOptions {
  secret: string;
  windowMs?: number;
  now?: () => number;
}

const DEFAULT_WINDOW_MS = 60_000;

function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

function sha256Hex(buf: Buffer | string): string {
  return createHash('sha256').update(buf).digest('hex');
}

function canonicalString(timestamp: string, method: string, path: string, bodyHashHex: string): string {
  return `${timestamp}\n${method.toUpperCase()}\n${path}\n${bodyHashHex}`;
}

export function verifySignature(options: VerifySignatureOptions) {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const now = options.now ?? Date.now;

  return (req: Request, res: Response, next: NextFunction): void => {
    const timestamp = req.header('x-timestamp');
    const provided = req.header('x-signature');

    if (!timestamp || !provided) {
      res.status(401).json({ error: 'missing_headers' satisfies SignatureError });
      return;
    }

    const tsMs = Number(timestamp);
    if (!Number.isFinite(tsMs) || Math.abs(now() - tsMs) > windowMs) {
      res.status(401).json({ error: 'stale_timestamp' satisfies SignatureError });
      return;
    }

    const rawBody: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
    const bodyHash = sha256Hex(rawBody);
    const expected = createHmac('sha256', options.secret)
      .update(canonicalString(timestamp, req.method, req.path, bodyHash))
      .digest('hex');

    if (!constantTimeEqualHex(provided, expected)) {
      res.status(401).json({ error: 'bad_signature' satisfies SignatureError });
      return;
    }

    next();
  };
}

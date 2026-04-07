import { createHash, createHmac } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

export type SignatureError =
  | 'missing_headers'
  | 'bad_signature';

export interface VerifySignatureOptions {
  secret: string;
}

function sha256Hex(buf: Buffer | string): string {
  return createHash('sha256').update(buf).digest('hex');
}

function canonicalString(timestamp: string, method: string, path: string, bodyHashHex: string): string {
  return `${timestamp}\n${method.toUpperCase()}\n${path}\n${bodyHashHex}`;
}

export function verifySignature(options: VerifySignatureOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timestamp = req.header('x-timestamp');
    const provided = req.header('x-signature');

    if (!timestamp || !provided) {
      res.status(401).json({ error: 'missing_headers' satisfies SignatureError });
      return;
    }

    const rawBody: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
    const bodyHash = sha256Hex(rawBody);
    const expected = createHmac('sha256', options.secret)
      .update(canonicalString(timestamp, req.method, req.path, bodyHash))
      .digest('hex');

    if (provided !== expected) {
      res.status(401).json({ error: 'bad_signature' satisfies SignatureError });
      return;
    }

    next();
  };
}

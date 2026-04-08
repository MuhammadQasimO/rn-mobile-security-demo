import CryptoJS from 'crypto-js';

export interface SignInput {
  method: string;
  path: string;
  body: string;
  secret: string;
  now?: () => number;
}

export interface SignedRequest {
  signature: string;
  timestamp: string;
}

function sha256Hex(input: string): string {
  return CryptoJS.SHA256(input).toString(CryptoJS.enc.Hex);
}

function hmacSha256Hex(message: string, secret: string): string {
  return CryptoJS.HmacSHA256(message, secret).toString(CryptoJS.enc.Hex);
}

export function canonicalString(timestamp: string, method: string, path: string, bodyHashHex: string): string {
  return `${timestamp}\n${method.toUpperCase()}\n${path}\n${bodyHashHex}`;
}

export function signRequest(input: SignInput): SignedRequest {
  const timestamp = String((input.now ?? Date.now)());
  const bodyHash = sha256Hex(input.body);
  const canonical = canonicalString(timestamp, input.method, input.path, bodyHash);
  const signature = hmacSha256Hex(canonical, input.secret);
  return { signature, timestamp };
}

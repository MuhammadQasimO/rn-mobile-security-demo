import { createHash, createHmac } from 'crypto';
import express from 'express';
import request from 'supertest';
import { verifySignature } from '../middleware/verifySignature';

const SECRET = 'test-secret';

function sign(timestamp: string, method: string, path: string, body: Buffer | string): string {
  const bodyHash = createHash('sha256').update(body).digest('hex');
  const canonical = `${timestamp}\n${method.toUpperCase()}\n${path}\n${bodyHash}`;
  return createHmac('sha256', SECRET).update(canonical).digest('hex');
}

function makeApp(now: () => number = Date.now) {
  const app = express();
  app.use(express.raw({ type: '*/*' }));
  app.use(verifySignature({ secret: SECRET, now }));
  app.post('/secure/echo', (req, res) => {
    res.json({ ok: true, len: (req.body as Buffer).length });
  });
  return app;
}

describe('verifySignature', () => {
  test('accepts a correctly signed request', async () => {
    const app = makeApp();
    const ts = String(Date.now());
    const body = Buffer.from(JSON.stringify({ hello: 'world' }));
    const sig = sign(ts, 'POST', '/secure/echo', body);

    const res = await request(app)
      .post('/secure/echo')
      .set('content-type', 'application/json')
      .set('x-timestamp', ts)
      .set('x-signature', sig)
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, len: body.length });
  });

  test('rejects request with missing headers', async () => {
    const app = makeApp();
    const res = await request(app).post('/secure/echo').send('hello');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('missing_headers');
  });

  test('rejects request with stale timestamp', async () => {
    const app = makeApp();
    const ts = String(Date.now() - 5 * 60_000);
    const body = Buffer.from('hello');
    const sig = sign(ts, 'POST', '/secure/echo', body);

    const res = await request(app)
      .post('/secure/echo')
      .set('x-timestamp', ts)
      .set('x-signature', sig)
      .send(body);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('stale_timestamp');
  });

  test('rejects request with tampered body', async () => {
    const app = makeApp();
    const ts = String(Date.now());
    const original = Buffer.from(JSON.stringify({ amount: 100 }));
    const tampered = Buffer.from(JSON.stringify({ amount: 999999 }));
    const sig = sign(ts, 'POST', '/secure/echo', original);

    const res = await request(app)
      .post('/secure/echo')
      .set('content-type', 'application/json')
      .set('x-timestamp', ts)
      .set('x-signature', sig)
      .send(tampered);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('bad_signature');
  });

  test('rejects request with malformed signature hex', async () => {
    const app = makeApp();
    const ts = String(Date.now());
    const body = Buffer.from('hello');

    const res = await request(app)
      .post('/secure/echo')
      .set('x-timestamp', ts)
      .set('x-signature', 'not-a-hex-string-at-all')
      .send(body);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('bad_signature');
  });
});

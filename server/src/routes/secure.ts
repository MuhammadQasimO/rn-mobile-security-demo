import { Router, raw } from 'express';
import { verifySignature } from '../middleware/verifySignature';

export function buildSecureRouter(secret: string): Router {
  const router = Router();

  router.use(raw({ type: '*/*' }));
  router.use(verifySignature({ secret }));

  router.post('/echo', (req, res) => {
    const body = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
    let parsed: unknown = null;
    if (body.length > 0) {
      try {
        parsed = JSON.parse(body);
      } catch {
        res.status(400).json({ error: 'invalid_json' });
        return;
      }
    }
    res.json({ ok: true, echoed: parsed });
  });

  return router;
}

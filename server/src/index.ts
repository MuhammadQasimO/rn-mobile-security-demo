import express from 'express';
import { buildSecureRouter } from './routes/secure';

const app = express();
const port = Number(process.env.PORT) || 3000;
const secret = process.env.HMAC_SECRET ?? 'dev-secret-do-not-use-in-prod';

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/secure', buildSecureRouter(secret));

if (require.main === module) {
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`server listening on http://localhost:${port}`);
  });
}

export { app };

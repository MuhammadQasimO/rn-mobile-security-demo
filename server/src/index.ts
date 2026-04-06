import express from 'express';

const app = express();
const port = Number(process.env.PORT) || 3000;

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

if (require.main === module) {
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`server listening on http://localhost:${port}`);
  });
}

export { app };

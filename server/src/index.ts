import cors from 'cors';
import express from 'express';
import { env } from './lib/env.js';
import './lib/db.js';
import { authRouter } from './routes/auth.js';
import { recordsRouter } from './routes/records.js';
import { attachmentsRouter } from './routes/attachments.js';
import { memoRouter } from './routes/memo.js';
import { digestRouter } from './routes/digest.js';

const app = express();

app.use(
  cors({
    origin: env.corsOrigins,
    credentials: false,
  })
);
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, smtpConfigured: env.smtpConfigured }));

app.use('/api/auth', authRouter);
app.use('/api/records', recordsRouter);
app.use('/api', attachmentsRouter);
app.use('/api', memoRouter);
app.use('/api/digest', digestRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(env.port, () => {
  console.log(`[server] NTE backend listening on http://localhost:${env.port}`);
  console.log(`[server] SMTP configured: ${env.smtpConfigured}`);
});

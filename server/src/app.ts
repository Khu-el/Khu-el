import cors from 'cors';
import express from 'express';
import multer from 'multer';
import { env } from './lib/env.js';
import './lib/db.js';
import { authRouter } from './routes/auth.js';
import { recordsRouter } from './routes/records.js';
import { attachmentsRouter } from './routes/attachments.js';
import { memoRouter } from './routes/memo.js';
import { digestRouter } from './routes/digest.js';

/**
 * The wired app, with no port bound to it. index.ts starts it; the tests take
 * it as it is and listen on an ephemeral port. Keeping construction separate
 * from listening is what lets the suite exercise the real routing, middleware
 * order and auth stack rather than a rebuilt approximation of them.
 */
export function createApp() {
  const app = express();
  app.set('trust proxy', env.trustProxy);

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
    // A file over the upload limit is the client's error, not ours.
    if (err instanceof multer.MulterError) {
      return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: err.message });
    }
    // body-parser marks its own client errors (malformed JSON, a body over the
    // size limit) with a 4xx status and `expose: true`. Those used to surface
    // as a 500, which reads as a server fault and hides what the caller got wrong.
    const status = (err as { status?: unknown })?.status;
    if (typeof status === 'number' && status >= 400 && status < 500 && (err as { expose?: unknown }).expose) {
      return res.status(status).json({ error: (err as Error).message });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

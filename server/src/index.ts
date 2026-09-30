import { env } from './lib/env.js';
import { createApp } from './app.js';

const app = createApp();

app.listen(env.port, () => {
  console.log(`[server] NTE backend listening on http://localhost:${env.port}`);
  console.log(`[server] SMTP configured: ${env.smtpConfigured}`);
});

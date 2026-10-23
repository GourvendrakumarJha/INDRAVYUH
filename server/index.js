import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();
const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`INDRAVYUH listening on http://0.0.0.0:${config.port} · ${config.demoMode ? 'DEMO / simulated data' : 'LIVE configuration'}`);
  if (!config.demoMode && config.nodeEnv === 'production' && !config.cookieSecure) {
    console.warn('WARNING: COOKIE_SECURE is false. Enable HTTPS and set COOKIE_SECURE=true for a live deployment.');
  }
});

const shutdown = (signal) => {
  console.log(`${signal} received; closing HTTP server.`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

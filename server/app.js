import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { loadUser, requirePortal, verifyOrigin } from './auth.js';
import { authRouter } from './routes-auth.js';
import { publicRouter } from './routes-public.js';
import { welfareRouter } from './routes-welfare.js';
import { welfareExtendedRouter } from './routes-welfare-extended.js';
import { businessRouter } from './routes-business.js';
import { employeeRouter } from './routes-employee.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy ? 1 : false);
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'same-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://maps.googleapis.com', 'https://maps.gstatic.com'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org', 'https://maps.googleapis.com', 'https://maps.gstatic.com'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", 'https://maps.googleapis.com', 'https://maps.gstatic.com'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: null,
      },
    },
  }));
  app.use(express.json({ limit: '256kb' }));
  app.use(cookieParser());
  app.use(loadUser);
  app.use('/api', verifyOrigin);
  app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: config.demoMode ? 60 : 12, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many sign-in attempts. Wait and try again.' } }));
  app.use(['/api/public/reports', '/api/public/sos', '/api/public/family-checkins'], rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many submissions from this connection. Wait and try again.' } }));
  app.use(['/api/public/track', '/api/public/family-safety'], rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many lookup attempts. Wait and try again.' } }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'indravyuh-api', demoMode: config.demoMode }));
  app.use('/api/auth', authRouter);
  app.use('/api/public', publicRouter);
  // Register the original general routes first; neither router may swallow a
  // more specific subpath registered by the other.
  app.use('/api/welfare', requirePortal('welfare'), welfareRouter, welfareExtendedRouter);
  app.use('/api/business', requirePortal('business'), businessRouter);
  app.use('/api/employee', requirePortal('employee'), employeeRouter);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }));

  const dist = path.join(config.root, 'dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist, { maxAge: config.nodeEnv === 'production' ? '1h' : 0, index: false }));
    app.use((req, res, next) => {
      if (!['GET', 'HEAD'].includes(req.method) || !req.accepts('html')) return next();
      res.set('Cache-Control', 'no-cache');
      res.sendFile(path.join(dist, 'index.html'));
    });
  }
  app.use((req, res) => res.status(404).json({ error: 'Not found. Build the frontend with npm run build, or use the Vite development server.' }));

  app.use((error, _req, res, _next) => {
    console.error('Request error:', error.message);
    if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Photo exceeds the 5 MB limit.' });
    if (error instanceof SyntaxError && 'body' in error) return res.status(400).json({ error: 'Invalid JSON request.' });
    res.status(500).json({ error: 'The request could not be completed.' });
  });
  return app;
}

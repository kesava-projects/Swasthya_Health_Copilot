import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';

import { env } from './config/env.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

import { authRoutes } from './modules/auth/auth.routes.js';
import { profileRoutes } from './modules/users/profile.routes.js';
import { documentRoutes } from './modules/documents/document.routes.js';
import { extractionRoutes } from './modules/extractions/extraction.routes.js';
import { observationRoutes } from './modules/observations/observation.routes.js';
import { medicationRoutes } from './modules/medications/medication.routes.js';
import { conditionRoutes } from './modules/conditions/condition.routes.js';
import { timelineRoutes } from './modules/timeline/timeline.routes.js';
import { summaryRoutes } from './modules/summaries/summary.routes.js';
import { chatRoutes } from './modules/chatbot/chat.routes.js';
import { reminderRoutes } from './modules/reminders/reminder.routes.js';
import { auditRoutes } from './modules/audit/audit.routes.js';
import { fhirRoutes } from './modules/fhir/fhir.routes.js';
import { aiRoutes } from './modules/ai/ai.routes.js';

export function createApp(): Express {
  const app = express();

  // Trust reverse proxy (essential for Render, Nginx, and cloud load balancers)
  app.set('trust proxy', 1);

  // Security headers & CORS
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  const clientOrigins = env.CLIENT_URL
    ? env.CLIENT_URL.split(',').map((u) => u.trim().replace(/\/+$/, ''))
    : [];

  const allowedOrigins = [
    ...clientOrigins,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://localhost:80',
  ].filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server, Render health checks)
        if (!origin) return callback(null, true);
        const normalized = origin.replace(/\/+$/, '');
        if (
          allowedOrigins.includes(normalized) ||
          allowedOrigins.includes('*') ||
          !env.CLIENT_URL ||
          env.CLIENT_URL === '*' ||
          normalized.endsWith('.onrender.com') ||
          normalized.endsWith('.vercel.app')
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // General rate limiting
  app.use(generalLimiter);

  // Health check endpoints (both /health and /api/health for Render/monitors)
  const healthHandler = (_req: express.Request, res: express.Response) => {
    res.json({
      status: 'healthy',
      service: 'swasthya-copilot-backend',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    });
  };
  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  // Friendly root route
  app.get('/', (_req, res) => {
    res.json({
      service: 'Swasthya Copilot Backend API',
      status: 'online',
      health: '/health',
      docs: '/api/health',
    });
  });

  // Mount Application Modules
  app.use('/api/auth', authRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/extractions', extractionRoutes);
  app.use('/api/observations', observationRoutes);
  app.use('/api/medications', medicationRoutes);
  app.use('/api/conditions', conditionRoutes);
  app.use('/api/timeline', timelineRoutes);
  app.use('/api/summaries', summaryRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/reminders', reminderRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/fhir', fhirRoutes);
  app.use('/api/ai', aiRoutes);

  // Optional: Serve frontend static build if present (e.g. single-service deployment on Render)
  const staticPathsToTry = [
    path.resolve(process.cwd(), '../frontend/dist'),
    path.resolve(process.cwd(), './frontend-dist'),
    path.resolve(process.cwd(), './public'),
  ];
  const staticPath = staticPathsToTry.find((p) => fs.existsSync(path.join(p, 'index.html')));

  if (staticPath && (env.SERVE_FRONTEND || env.NODE_ENV === 'production')) {
    app.use(express.static(staticPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path === '/health') {
        return next();
      }
      res.sendFile(path.join(staticPath, 'index.html'));
    });
  }

  // 404 handler for unmatched API routes
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'API route not found' });
  });

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}

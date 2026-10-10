import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { aiLimiter } from '../../middleware/rateLimiter.js';
import {
  getDocumentSummary,
  generateDocumentSummary,
  getPatientOverallSummary,
  generatePatientOverallSummary,
} from './summary.controller.js';

const router = Router();

router.get('/document/:documentId', requireAuth, getDocumentSummary);
router.post('/document/:documentId/generate', requireAuth, aiLimiter, generateDocumentSummary);
router.get('/patient', requireAuth, getPatientOverallSummary);
router.post('/patient/generate', requireAuth, aiLimiter, generatePatientOverallSummary);

export const summaryRoutes = router;

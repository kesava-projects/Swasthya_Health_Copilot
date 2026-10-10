import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { getExtraction, updateExtraction, confirmExtraction } from './extraction.controller.js';

const router = Router();

router.get('/:documentId', requireAuth, getExtraction);
router.put('/:documentId', requireAuth, updateExtraction);
router.post('/:documentId/confirm', requireAuth, confirmExtraction);

export const extractionRoutes = router;

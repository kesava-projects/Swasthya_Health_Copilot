import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { listConditions } from './condition.controller.js';

const router = Router();

router.get('/', requireAuth, listConditions);

export const conditionRoutes = router;

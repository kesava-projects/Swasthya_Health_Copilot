import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { listObservations, getObservationTrends } from './observation.controller.js';

const router = Router();

router.get('/', requireAuth, listObservations);
router.get('/trends', requireAuth, getObservationTrends);

export const observationRoutes = router;

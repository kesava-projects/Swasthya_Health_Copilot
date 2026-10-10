import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { listTimelineEvents } from './timeline.controller.js';

const router = Router();

router.get('/', requireAuth, listTimelineEvents);

export const timelineRoutes = router;

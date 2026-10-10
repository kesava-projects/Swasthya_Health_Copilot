import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { getDashboardOverview } from './profile.controller.js';

const router = Router();

router.get('/dashboard', requireAuth, getDashboardOverview);

export const profileRoutes = router;

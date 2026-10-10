import { Router } from 'express';
import { register, login, logout, getCurrentUser, updateProfile } from './auth.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { registerSchema, loginSchema, updateProfileSchema } from './auth.validation.js';
import { authLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

router.post('/register', authLimiter, validateBody(registerSchema), register);
router.post('/login', authLimiter, validateBody(loginSchema), login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, getCurrentUser);
router.patch('/profile', requireAuth, validateBody(updateProfileSchema), updateProfile);

export const authRoutes = router;

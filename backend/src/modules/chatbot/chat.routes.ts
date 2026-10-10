import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { aiLimiter } from '../../middleware/rateLimiter.js';
import {
  createConversation,
  listConversations,
  getConversationMessages,
  sendMessage,
  deleteConversation,
} from './chat.controller.js';

const router = Router();

router.post('/conversations', requireAuth, createConversation);
router.get('/conversations', requireAuth, listConversations);
router.get('/conversations/:id/messages', requireAuth, getConversationMessages);
router.post('/conversations/:id/messages', requireAuth, aiLimiter, sendMessage);
router.delete('/conversations/:id', requireAuth, deleteConversation);

export const chatRoutes = router;

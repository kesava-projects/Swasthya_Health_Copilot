import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import {
  createReminder,
  listReminders,
  updateReminderStatus,
  deleteReminder,
} from './reminder.controller.js';

const router = Router();

router.post('/', requireAuth, createReminder);
router.get('/', requireAuth, listReminders);
router.patch('/:id', requireAuth, updateReminderStatus);
router.delete('/:id', requireAuth, deleteReminder);

export const reminderRoutes = router;

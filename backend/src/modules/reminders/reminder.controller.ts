import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { ReminderModel } from './reminder.model.js';
import { logAuditEvent } from '../audit/audit.service.js';

export async function createReminder(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { title, notes, reminderType, scheduledTime, sourceDocumentId, dosage, frequency } = req.body;

  if (!title || !scheduledTime || !reminderType) {
    res.status(400).json({ success: false, error: 'Title, reminderType, and scheduledTime are required' });
    return;
  }

  const reminder = await ReminderModel.create({
    userId,
    title,
    notes,
    reminderType,
    scheduledTime: new Date(scheduledTime),
    sourceDocumentId,
    dosage,
    frequency,
    userConfirmed: true,
    status: 'pending',
  });

  await logAuditEvent(req, 'CREATE_REMINDER', 'REMINDER', reminder._id.toString(), { title, reminderType });

  res.status(201).json({
    success: true,
    reminder,
  });
}

export async function listReminders(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { status, type } = req.query;

  const query: any = { userId };
  if (status) query.status = status;
  if (type) query.reminderType = type;

  const reminders = await ReminderModel.find(query).sort({ scheduledTime: 1 });

  res.json({
    success: true,
    reminders,
  });
}

export async function updateReminderStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { id } = req.params;
  const { status, scheduledTime } = req.body;

  const reminder = await ReminderModel.findOne({ _id: id, userId });
  if (!reminder) {
    res.status(404).json({ success: false, error: 'Reminder not found' });
    return;
  }

  if (status) {
    reminder.status = status;
  }
  if (scheduledTime) {
    reminder.scheduledTime = new Date(scheduledTime);
  }

  await reminder.save();
  await logAuditEvent(req, 'UPDATE_REMINDER', 'REMINDER', reminder._id.toString(), { newStatus: status });

  res.json({
    success: true,
    reminder,
  });
}

export async function deleteReminder(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { id } = req.params;

  const reminder = await ReminderModel.findOneAndDelete({ _id: id, userId });
  if (!reminder) {
    res.status(404).json({ success: false, error: 'Reminder not found' });
    return;
  }

  res.json({ success: true, message: 'Reminder deleted successfully' });
}

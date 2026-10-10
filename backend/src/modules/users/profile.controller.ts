import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { UserModel } from './user.model.js';
import { DocumentModel } from '../documents/document.model.js';
import { ObservationModel } from '../observations/observation.model.js';
import { MedicationRecordModel } from '../medications/medication.model.js';
import { ConditionRecordModel } from '../conditions/condition.model.js';
import { ReminderModel } from '../reminders/reminder.model.js';
import { HealthTimelineEventModel } from '../timeline/timeline.model.js';

export async function getDashboardOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;

  const [
    user,
    totalDocuments,
    awaitingReviewDocs,
    failedDocs,
    recentDocuments,
    recentObservations,
    activeMedications,
    activeConditions,
    upcomingReminders,
    recentTimelineEvents,
  ] = await Promise.all([
    UserModel.findById(userId).select('-passwordHash'),
    DocumentModel.countDocuments({ userId }),
    DocumentModel.countDocuments({ userId, processingStatus: 'awaiting_review' }),
    DocumentModel.countDocuments({ userId, processingStatus: 'failed' }),
    DocumentModel.find({ userId }).sort({ createdAt: -1 }).limit(5),
    ObservationModel.find({ userId }).sort({ observationDate: -1 }).limit(8).populate('sourceDocumentId', 'originalName'),
    MedicationRecordModel.countDocuments({ userId, isCurrent: true }),
    ConditionRecordModel.countDocuments({ userId, status: 'active' }),
    ReminderModel.find({ userId, status: 'pending', scheduledTime: { $gte: new Date() } })
      .sort({ scheduledTime: 1 })
      .limit(4),
    HealthTimelineEventModel.find({ userId }).sort({ eventDate: -1 }).limit(6).populate('sourceDocumentId', 'originalName'),
  ]);

  res.json({
    success: true,
    data: {
      user: {
        id: user?._id,
        name: user?.name,
        email: user?.email,
        bloodGroup: user?.bloodGroup,
        mockAbhaId: user?.mockAbhaId,
        allergies: user?.allergies,
        preferredLanguage: user?.preferredLanguage,
      },
      metrics: {
        totalDocuments,
        awaitingReviewCount: awaitingReviewDocs,
        failedCount: failedDocs,
        activeMedicationsCount: activeMedications,
        activeConditionsCount: activeConditions,
      },
      recentDocuments: recentDocuments.map((d) => ({
        id: d._id,
        originalName: d.originalName,
        documentType: d.documentType,
        documentDate: d.documentDate,
        processingStatus: d.processingStatus,
        createdAt: d.createdAt,
      })),
      recentObservations,
      upcomingReminders,
      recentTimelineEvents,
    },
  });
}

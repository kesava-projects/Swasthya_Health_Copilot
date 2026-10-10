import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { HealthTimelineEventModel } from './timeline.model.js';

export async function listTimelineEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { category, eventType, startDate, endDate, isVerified } = req.query;

  const query: any = { userId };
  if (category) query.category = category;
  if (eventType) query.eventType = eventType;
  if (isVerified !== undefined) query.isVerified = isVerified === 'true';

  if (startDate || endDate) {
    query.eventDate = {};
    if (startDate) query.eventDate.$gte = new Date(String(startDate));
    if (endDate) query.eventDate.$lte = new Date(String(endDate));
  }

  const events = await HealthTimelineEventModel.find(query)
    .sort({ eventDate: -1, createdAt: -1 })
    .populate('sourceDocumentId', 'originalName documentType mimeType sizeBytes pageCount documentDate processingStatus');

  res.json({
    success: true,
    count: events.length,
    events,
  });
}

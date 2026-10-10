import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { ConditionRecordModel } from './condition.model.js';

export async function listConditions(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { status } = req.query;

  const query: any = { userId };
  if (status) {
    query.status = status;
  }

  const conditions = await ConditionRecordModel.find(query)
    .sort({ diagnosedDate: -1 })
    .populate('sourceDocumentId', 'originalName documentType');

  res.json({
    success: true,
    count: conditions.length,
    conditions,
  });
}

import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { MedicationRecordModel } from './medication.model.js';

export async function listMedications(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { currentOnly } = req.query;

  const query: any = { userId };
  if (currentOnly === 'true') {
    query.isCurrent = true;
  }

  const medications = await MedicationRecordModel.find(query)
    .sort({ prescribedDate: -1 })
    .populate('sourceDocumentId', 'originalName documentType');

  res.json({
    success: true,
    count: medications.length,
    medications,
  });
}

export async function toggleMedicationStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { id } = req.params;

  const med = await MedicationRecordModel.findOne({ _id: id, userId });
  if (!med) {
    res.status(404).json({ success: false, error: 'Medication record not found' });
    return;
  }

  med.isCurrent = !med.isCurrent;
  await med.save();

  res.json({
    success: true,
    medication: med,
    message: `Medication marked as ${med.isCurrent ? 'Current' : 'Discontinued'}`,
  });
}

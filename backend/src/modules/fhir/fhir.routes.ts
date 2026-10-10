import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth.js';
import { UserModel } from '../users/user.model.js';
import { DocumentModel } from '../documents/document.model.js';
import { ObservationModel } from '../observations/observation.model.js';
import { MedicationRecordModel } from '../medications/medication.model.js';
import { ConditionRecordModel } from '../conditions/condition.model.js';
import { FhirMapper } from './fhir.service.js';

const router = Router();

router.get('/export', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;

  const [user, docs, obs, meds, conds] = await Promise.all([
    UserModel.findById(userId),
    DocumentModel.find({ userId }),
    ObservationModel.find({ userId, verificationStatus: 'user_confirmed' }),
    MedicationRecordModel.find({ userId, verificationStatus: 'user_confirmed' }),
    ConditionRecordModel.find({ userId, verificationStatus: 'user_confirmed' }),
  ]);

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  const entries: any[] = [];

  // Patient
  const patientResource = FhirMapper.toFhirPatient(user);
  entries.push({ fullUrl: `urn:uuid:${patientResource.id}`, resource: patientResource });

  // Documents
  docs.forEach((d) => {
    const docRef = FhirMapper.toFhirDocumentReference(d, user._id.toString());
    entries.push({ fullUrl: `urn:uuid:${docRef.id}`, resource: docRef });
  });

  // Observations
  obs.forEach((o) => {
    const obsResource = FhirMapper.toFhirObservation(o, user._id.toString());
    entries.push({ fullUrl: `urn:uuid:${obsResource.id}`, resource: obsResource });
  });

  // Medications
  meds.forEach((m) => {
    const medResource = FhirMapper.toFhirMedicationRequest(m, user._id.toString());
    entries.push({ fullUrl: `urn:uuid:${medResource.id}`, resource: medResource });
  });

  // Conditions
  conds.forEach((c) => {
    const condResource = FhirMapper.toFhirCondition(c, user._id.toString());
    entries.push({ fullUrl: `urn:uuid:${condResource.id}`, resource: condResource });
  });

  const bundle = {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: new Date().toISOString(),
    total: entries.length,
    entry: entries,
  };

  res.setHeader('Content-Type', 'application/fhir+json');
  res.json(bundle);
});

export const fhirRoutes = router;

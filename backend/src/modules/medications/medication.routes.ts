import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { listMedications, toggleMedicationStatus } from './medication.controller.js';

const router = Router();

router.get('/', requireAuth, listMedications);
router.patch('/:id/toggle-current', requireAuth, toggleMedicationStatus);

export const medicationRoutes = router;

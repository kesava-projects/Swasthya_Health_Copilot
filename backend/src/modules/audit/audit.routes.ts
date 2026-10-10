import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth.js';
import { AuditLogModel } from './audit.model.js';

const router = Router();

router.get('/logs', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  const logs = await AuditLogModel.find({ userId }).sort({ timestamp: -1 }).limit(50);

  res.json({
    success: true,
    count: logs.length,
    logs,
  });
});

export const auditRoutes = router;

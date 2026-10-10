import { Request } from 'express';
import { AuditLogModel, AuditAction } from './audit.model.js';
import { logger } from '../../utils/logger.js';

export async function logAuditEvent(
  req: Request | null,
  action: AuditAction,
  resourceType: string,
  resourceId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const userId = (req as any)?.user?.userId;
    const ipAddress = req?.ip || req?.socket?.remoteAddress;
    const userAgent = req?.headers['user-agent'];

    await AuditLogModel.create({
      userId,
      action,
      resourceType,
      resourceId,
      ipAddress,
      userAgent,
      details,
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error('Failed to write audit log', { error, action, resourceType });
  }
}

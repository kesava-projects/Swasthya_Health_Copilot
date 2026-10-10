import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt.js';
import { logAuditEvent } from '../modules/audit/audit.service.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
  file?: Express.Multer.File;
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.query && typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (!token) {
      logAuditEvent(req, 'UNAUTHORIZED_ACCESS_ATTEMPT', 'AUTH', undefined, {
        reason: 'Missing token',
        path: req.originalUrl,
      });
      res.status(401).json({ success: false, error: 'Authentication required. Please log in.' });
      return;
    }

    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    logAuditEvent(req, 'UNAUTHORIZED_ACCESS_ATTEMPT', 'AUTH', undefined, {
      reason: 'Invalid or expired token',
      path: req.originalUrl,
    });
    res.status(401).json({ success: false, error: 'Invalid or expired token. Please log in again.' });
  }
}

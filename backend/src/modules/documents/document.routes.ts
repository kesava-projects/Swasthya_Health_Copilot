import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../../middleware/auth.js';
import {
  uploadDocument,
  listDocuments,
  getDocumentById,
  downloadDocument,
  deleteDocument,
  reprocessDocument,
} from './document.controller.js';

const router = Router();

// Multer memory storage configuration with 15MB limit and MIME checks
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB max file size
  },
  fileFilter: (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowed.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only PDF, JPG, and PNG files are accepted.'));
    }
  },
});

router.post('/upload', requireAuth, upload.single('file'), uploadDocument);
router.get('/', requireAuth, listDocuments);
router.get('/:id', requireAuth, getDocumentById);
router.get('/:id/download', requireAuth, downloadDocument);
router.get('/:id/preview', requireAuth, downloadDocument);
router.delete('/:id', requireAuth, deleteDocument);
router.post('/:id/reprocess', requireAuth, reprocessDocument);

export const documentRoutes = router;

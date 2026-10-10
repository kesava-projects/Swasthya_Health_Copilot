import { Router, Response } from 'express';
import { aiService } from '../../services/ai/ai.service.js';
import { ocrClient } from '../../services/ocr/ocr.client.js';

const router = Router();

router.get('/status', async (_req, res: Response) => {
  const ocrAvailable = await ocrClient.isServiceAvailable();
  const aiStatus = aiService.getStatus();

  res.json({
    success: true,
    ai: aiStatus,
    ocr: {
      available: ocrAvailable,
      engine: 'tesseract',
      supportedLanguages: ['eng', 'hin', 'tel'],
    },
  });
});

export const aiRoutes = router;

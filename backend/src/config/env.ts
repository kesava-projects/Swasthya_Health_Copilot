import dotenv from 'dotenv';
import { z } from 'zod';
import { logger } from '../utils/logger.js';

dotenv.config();

const envSchema = z.object({
  PORT: z.union([z.string(), z.number()]).default('5001').transform((v) => Number(v)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/swasthya_copilot'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long').default('super-secret-key-change-in-production-min-32-chars-long'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  OCR_SERVICE_URL: z.string().default('http://127.0.0.1:8000'),
  UPLOAD_DIR: z.string().default('./uploads'),
  SERVE_FRONTEND: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  
  // AI Config
  AI_PROVIDER: z.enum(['gemini', 'openrouter', 'mock']).default('gemini'),
  LLM_API_KEY: z.string().optional().default(''),
  LLM_MODEL: z.string().default('gemini-flash-lite-latest'),
  LLM_TIMEOUT_MS: z.union([z.string(), z.number()]).default('30000').transform((v) => Number(v)),
  LLM_MAX_RETRIES: z.union([z.string(), z.number()]).default('2').transform((v) => Number(v)),
  LLM_MAX_OUTPUT_TOKENS: z.union([z.string(), z.number()]).default('2048').transform((v) => Number(v)),
  
  // OpenRouter (optional)
  OPENROUTER_BASE_URL: z.string().default('https://openrouter.ai/api/v1'),
  OPENROUTER_MODEL: z.string().default('google/gemini-flash-1.5'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  logger.error('Invalid environment variables:', { errors: parsed.error.format() });
  process.exit(1);
}

export const env = parsed.data;

if (!env.LLM_API_KEY) {
  logger.warn('⚠️  LLM_API_KEY is not configured! Swasthya Copilot will run in DEMO / CONFIG-CHECK mode. Real LLM extraction and RAG will request an API key.');
}

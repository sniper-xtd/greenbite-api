import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config(); // Load .env before parsing

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // ✅ Email / SMTP Settings
  SMTP_HOST: z.string().min(1, 'SMTP_HOST is required'),
  SMTP_PORT: z.string().min(1, 'SMTP_PORT is required'),
  SMTP_USER: z.string().email('SMTP_USER must be a valid email'),
  SMTP_PASS: z.string().min(1, 'SMTP_PASS is required'),
});

// ✅ Export the validated env object
export const env = envSchema.parse(process.env);

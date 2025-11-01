import { config } from 'dotenv'
import { z } from 'zod'

config()

// environment variables schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  POSTGRES_URL: z
    .string()
    .min(1, 'POSTGRES_URL is required to connect to the database'),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default('0.0.0.0'),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(24),
  DB_SSL: z.coerce.boolean().default(false),
  CORS_ORIGIN: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  KEEPER_PASSWORD: z.string().optional(),
  VET_PASSWORD: z.string().optional(),
  RESEARCHER_PASSWORD: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  throw new Error('Invalid environment configuration')
}

export const env = parsed.data

export type Env = typeof env


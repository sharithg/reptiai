import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '../env'
import * as schema from './schema'

// Database connection - use DATABASE_URL as primary, POSTGRES_URL as fallback for compatibility
const connectionString = env.POSTGRES_URL

const sql = postgres(connectionString, {
  ssl: env.DB_SSL ? 'require' : false,
  max: 10, // Maximum number of connections in the pool
  idle_timeout: 20, // Close idle connections after 20 seconds
  max_lifetime: 60 * 30, // Close connections after 30 minutes
})

// Connect to Postgres with schema
export const db = drizzle(sql, { schema })

// Export all schema tables for easy access
export * from './schema'

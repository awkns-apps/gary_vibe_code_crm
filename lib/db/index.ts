import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

/**
 * The database is a pooled Neon endpoint in ap-southeast-1: ~69ms per round
 * trip, and roughly 150-200ms more to open a *new* connection (TLS handshake).
 * So the cost of a page is dominated by how many connections it opens and how
 * many round trips it makes — not by how many rows come back.
 *
 * Hence: keep connections alive and reused, and prefer one wide query over
 * several narrow ones (see lib/crm-data.ts).
 */
const globalForDb = globalThis as unknown as { pool?: Pool }

export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // A handful of warm connections beats many cold ones.
    max: 8,
    idleTimeoutMillis: 60_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
  })

// Survive dev hot-reloads so every edit does not re-handshake the database.
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool

export const db = drizzle(pool, { schema })

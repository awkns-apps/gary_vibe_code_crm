#!/usr/bin/env node
/**
 * fetch-unanalyzed.mjs — READ ONLY.
 *
 * Emits, as JSON on stdout, the contact_messages that have NOT yet been
 * processed by a completed AI analysis run. "Processed" is determined by
 * looking for a completed crm_agent_runs row whose source_refs contains
 * { kind: "contact_message", id: "<message id>" }. No schema change needed.
 *
 * Usage:
 *   node scripts/crm-analyst/fetch-unanalyzed.mjs [--limit 25]
 *
 * Output shape:
 *   { "generatedAt": ISO, "count": N, "messages": [ {id,name,email,subject,message,createdAt}, ... ] }
 */
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import pg from "pg"

// --- load DATABASE_URL from project .env.local (works regardless of cwd) ---
const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(here, "..", "..")
loadEnv(resolve(projectRoot, ".env.local"))

function loadEnv(path) {
  if (process.env.DATABASE_URL) return
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m) continue
      const key = m[1]
      let val = m[2].replace(/^["']|["']$/g, "")
      if (!(key in process.env)) process.env[key] = val
    }
  } catch {
    /* ignore — env may be provided by the runner */
  }
}

const limitArg = process.argv.indexOf("--limit")
const limit = limitArg !== -1 ? Math.max(1, Math.min(100, Number(process.argv[limitArg + 1]) || 25)) : 25

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

const SQL = `
  select cm.id, cm.name, cm.email, cm.subject, cm.message, cm.created_at as "createdAt"
  from contact_messages cm
  where not exists (
    select 1 from crm_agent_runs r
    where r.status = 'completed'
      and r.source_refs @> jsonb_build_array(
        jsonb_build_object('kind', 'contact_message', 'id', cm.id::text)
      )
  )
  order by cm.created_at asc
  limit $1
`

try {
  const { rows } = await pool.query(SQL, [limit])
  process.stdout.write(
    JSON.stringify({ generatedAt: new Date().toISOString(), count: rows.length, messages: rows }, null, 2) + "\n",
  )
} catch (err) {
  process.stderr.write(`fetch-unanalyzed failed: ${err.message}\n`)
  process.exitCode = 1
} finally {
  await pool.end()
}

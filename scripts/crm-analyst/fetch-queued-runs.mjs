#!/usr/bin/env node
/**
 * fetch-queued-runs.mjs — READ ONLY.
 *
 * Emits, as JSON on stdout, the crm_agent_runs sitting in status 'queued'
 * together with everything Claude needs to do the work: the client, the
 * approved needs analysis that triggered the run, and the deal it belongs to.
 *
 * Queued runs are created by the admin app when a needs analysis is approved
 * (see lib/crm-approval.ts). This script is the cron-side counterpart.
 *
 * Usage:
 *   node scripts/crm-analyst/fetch-queued-runs.mjs [--limit 10] [--task pricing_analysis]
 *
 * Output shape:
 *   { "generatedAt": ISO, "count": N, "runs": [ { runId, taskType, agentName,
 *     promptVersion, input, client, needsAnalysis, deal }, ... ] }
 */
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import pg from "pg"

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(here, "..", "..")
loadEnv(resolve(projectRoot, ".env.local"))

function loadEnv(path) {
  if (process.env.DATABASE_URL) return
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m) continue
      if (!(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
    }
  } catch {
    /* ignore — env may be provided by the runner */
  }
}

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

const limit = Math.max(1, Math.min(50, Number(arg("limit", 10)) || 10))
const taskType = arg("task", "pricing_analysis")

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

const SQL = `
  select
    r.id            as "runId",
    r.task_type     as "taskType",
    r.agent_name    as "agentName",
    r.prompt_version as "promptVersion",
    r.input         as "input",
    r.created_at    as "queuedAt",
    to_jsonb(c.*) - 'notes' as "client",
    to_jsonb(a.*)   as "needsAnalysis",
    to_jsonb(d.*)   as "deal"
  from crm_agent_runs r
  left join crm_clients  c on c.id = r.client_id
  left join crm_analyses a on a.id = (r.input->>'needsAnalysisId')::int
  left join crm_deals    d on d.id = (r.input->>'dealId')::int
  where r.status = 'queued'
    and ($2::text is null or r.task_type = $2)
  order by r.created_at asc
  limit $1
`

try {
  const { rows } = await pool.query(SQL, [limit, taskType === "all" ? null : taskType])
  process.stdout.write(
    JSON.stringify({ generatedAt: new Date().toISOString(), count: rows.length, runs: rows }, null, 2) + "\n",
  )
} catch (err) {
  process.stderr.write(`fetch-queued-runs failed: ${err.message}\n`)
  process.exitCode = 1
} finally {
  await pool.end()
}

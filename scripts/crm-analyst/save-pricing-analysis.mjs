#!/usr/bin/env node
/**
 * save-pricing-analysis.mjs — TRANSACTIONAL WRITE.
 *
 * Completes the queued pricing runs produced by approving a needs analysis.
 * For each item it writes, in a single transaction:
 *   1. crm_analyses   — a pricing analysis in status 'needs_review', linked to
 *                       the same client and deal as the run
 *   2. crm_agent_runs — the queued run moves to 'completed', analysis_id points
 *                       at the produced pricing analysis, source_refs pinned
 *   3. crm_activities — a timeline entry on the deal
 *
 * The pricing analysis lands in 'needs_review' on purpose: approving it is what
 * moves the deal to 'proposal' and writes the recommended price onto it.
 *
 * Idempotent: a run that is no longer 'queued' is skipped.
 *
 * Input: JSON on stdin OR a file path as argv[2].
 *   { "model": "claude-opus-4", "promptVersion": "pricing-v1",
 *     "items": [ Item, ... ] }
 *
 * Item shape (success):
 *   {
 *     "runId": 42,
 *     "analysis": { "title": "...", "summary": "...",
 *                   "findings": [{ "label": "recommended_price", "detail": "NT$ 180,000" }],
 *                   "recommendations": ["..."],
 *                   "evidence": [{ "title": "需求分析 #12" }],
 *                   "confidence": 71 }
 *   }
 * Item shape (failure — records why the agent could not price it):
 *   { "runId": 42, "error": "資訊不足，無法estimate工時" }
 *
 * Finding labels for pricing: see docs/crm/analysis-schemas.md.
 * `recommended_price` is the one the admin app parses onto the deal.
 *
 * Output: JSON summary { saved, skipped, failed, results:[...] } on stdout.
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
    /* ignore */
  }
}

function readInput() {
  const fileArg = process.argv[2]
  const raw = fileArg ? readFileSync(fileArg, "utf8") : readFileSync(0, "utf8")
  if (!raw.trim()) throw new Error("empty input")
  return JSON.parse(raw)
}

const payload = readInput()
const items = Array.isArray(payload.items) ? payload.items : []
if (items.length === 0) {
  process.stdout.write(JSON.stringify({ saved: 0, skipped: 0, failed: 0, results: [] }) + "\n")
  process.exit(0)
}

const model = payload.model || null
const promptVersion = payload.promptVersion || "pricing-v1"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

async function loadRun(client, runId) {
  if (!Number.isInteger(runId)) throw new Error("runId (int) required")
  const { rows } = await client.query(
    `select id, client_id as "clientId", status, input, agent_name as "agentName"
       from crm_agent_runs where id = $1 for update`,
    [runId],
  )
  if (rows.length === 0) throw new Error(`run ${runId} not found`)
  return rows[0]
}

async function failOne(client, run, message) {
  await client.query(
    `update crm_agent_runs
        set status = 'failed', error = $2, started_at = coalesce(started_at, now()), completed_at = now()
      where id = $1`,
    [run.id, String(message)],
  )
  return { runId: run.id, failed: true, error: String(message) }
}

async function saveOne(client, it) {
  const run = await loadRun(client, it.runId)
  if (run.status !== "queued") {
    return { runId: run.id, skipped: true, reason: `run is '${run.status}', not 'queued'` }
  }
  if (it.error) return failOne(client, run, it.error)

  const a = it.analysis
  if (!a?.title?.trim()) throw new Error(`analysis.title required for run ${run.id}`)

  const dealId = run.input?.dealId ?? null
  const needsAnalysisId = run.input?.needsAnalysisId ?? null

  // 1. pricing analysis (needs_review — approving it is what prices the deal)
  const analysisIns = await client.query(
    `insert into crm_analyses (client_id, deal_id, type, title, status, summary, findings, recommendations, evidence, confidence, created_by)
     values ($1,$2,'pricing',$3,'needs_review',$4,$5::jsonb,$6::jsonb,$7::jsonb,$8,$9)
     returning id`,
    [
      run.clientId,
      dealId,
      a.title.trim(),
      a.summary || null,
      JSON.stringify(Array.isArray(a.findings) ? a.findings : []),
      JSON.stringify(Array.isArray(a.recommendations) ? a.recommendations : []),
      JSON.stringify(Array.isArray(a.evidence) ? a.evidence : []),
      a.confidence == null ? null : Number(a.confidence),
      run.agentName,
    ],
  )
  const analysisId = analysisIns.rows[0].id

  // 2. close out the run, pinning the produced analysis
  await client.query(
    `update crm_agent_runs
        set status = 'completed',
            analysis_id = $2::int,
            output = $3::jsonb,
            model = coalesce($4, model),
            prompt_version = coalesce($5, prompt_version),
            source_refs = source_refs || jsonb_build_array(jsonb_build_object('kind','pricing_analysis','id',$6::text)),
            started_at = coalesce(started_at, now()),
            completed_at = now()
      where id = $1`,
    [
      run.id,
      analysisId,
      JSON.stringify({ pricingAnalysisId: analysisId, needsAnalysisId, dealId, confidence: a.confidence ?? null }),
      model,
      promptVersion,
      String(analysisId),
    ],
  )

  // 3. timeline entry
  await client.query(
    `insert into crm_activities (client_id, deal_id, type, subject, content, source, occurred_at)
     values ($1,$2,'note',$3,$4,'agent', now())`,
    [run.clientId, dealId, `報價分析待審：${a.title.trim()}`, a.summary || null],
  )

  return { runId: run.id, skipped: false, analysisId, dealId }
}

const results = []
let saved = 0
let skipped = 0
let failed = 0
let errored = 0

for (const it of items) {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const r = await saveOne(client, it)
    await client.query("COMMIT")
    results.push(r)
    if (r.skipped) skipped++
    else if (r.failed) failed++
    else saved++
  } catch (err) {
    // The whole item rolled back — nothing half-written, run stays 'queued'.
    await client.query("ROLLBACK").catch(() => {})
    results.push({ runId: it?.runId ?? null, error: err.message })
    errored++
  } finally {
    client.release()
  }
}

await pool.end()
// saved/failed = agent outcomes written to the DB; errored = this script blew up.
process.stdout.write(JSON.stringify({ saved, skipped, failed, errored, results }, null, 2) + "\n")
if (errored > 0) process.exitCode = 1

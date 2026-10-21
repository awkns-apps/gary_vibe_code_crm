#!/usr/bin/env node
/**
 * save-analysis.mjs — TRANSACTIONAL WRITE.
 *
 * Persists one or more AI needs-analyses produced for website inquiries.
 * For each item it writes, in a single transaction:
 *   1. crm_clients      — a new lead (source=contact_form) unless clientId given
 *   2. crm_analyses     — a needs analysis in status 'needs_review'
 *   3. crm_activities   — an inbound record of the original inquiry
 *   4. crm_agent_runs   — a completed audit row whose source_refs pins the
 *                         contact_message id (this is what marks it "analyzed"
 *                         for fetch-unanalyzed.mjs) plus the created client/analysis.
 *
 * Idempotent: a completed run whose source_refs already contains the given
 * contact_message id is skipped (safe to re-run a cron tick).
 *
 * Input: JSON on stdin OR a file path as argv[2].
 *   { "agentName": "crm-inquiry-analyst", "model": "claude-opus-4",
 *     "promptVersion": "needs-v1", "items": [ Item, ... ] }
 *
 * Item shape:
 *   {
 *     "messageId": 16,
 *     "client": { "name": "獨立遊戲工作室（羅心妍）", "industry": "遊戲",
 *                 "website": null, "summary": "...", "tags": ["影像生成"] },
 *     "analysis": { "title": "...", "summary": "...",
 *                   "findings": [{ "label": "pain_point", "detail": "..." }],
 *                   "recommendations": ["..."],
 *                   "evidence": [{ "title": "網站諮詢 #16", "note": "..." }],
 *                   "confidence": 74 },
 *     "activity": { "subject": "網站諮詢：影像生成", "content": "原始訊息…" }
 *   }
 *
 * Output: JSON summary { saved, skipped, results:[...] } on stdout.
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
  process.stdout.write(JSON.stringify({ saved: 0, skipped: 0, results: [] }) + "\n")
  process.exit(0)
}

const agentName = String(payload.agentName || "crm-inquiry-analyst")
const model = payload.model || null
const promptVersion = payload.promptVersion || "needs-v1"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

function assertItem(it) {
  if (!Number.isInteger(it.messageId)) throw new Error("messageId (int) required")
  if (!it.client?.name?.trim()) throw new Error(`client.name required for message ${it.messageId}`)
  if (!it.analysis?.title?.trim()) throw new Error(`analysis.title required for message ${it.messageId}`)
}

async function saveOne(client, it) {
  assertItem(it)
  const msgId = it.messageId
  const idempotencyKey = `inquiry-needs-${msgId}`

  // Idempotency guard: already analyzed?
  const dup = await client.query(
    `select 1 from crm_agent_runs
      where status = 'completed'
        and source_refs @> jsonb_build_array(jsonb_build_object('kind','contact_message','id',$1::text))
      limit 1`,
    [msgId],
  )
  if (dup.rowCount > 0) return { messageId: msgId, skipped: true, reason: "already analyzed" }

  // 1. client (lead) — reuse if clientId supplied
  let clientId = it.client.clientId ?? null
  if (!clientId) {
    const c = it.client
    const ins = await client.query(
      `insert into crm_clients (name, client_type, industry, website, source, status, tags, summary, last_interaction_at)
       values ($1,$2,$3,$4,'contact_form','lead',$5::jsonb,$6, now())
       returning id`,
      [
        c.name.trim(),
        c.clientType || "company",
        c.industry || null,
        c.website || null,
        JSON.stringify(Array.isArray(c.tags) ? c.tags : []),
        c.summary || null,
      ],
    )
    clientId = ins.rows[0].id
  }

  // 2. analysis (needs_review)
  const a = it.analysis
  const analysisIns = await client.query(
    `insert into crm_analyses (client_id, type, title, status, summary, findings, recommendations, evidence, confidence, created_by)
     values ($1,'needs',$2,'needs_review',$3,$4::jsonb,$5::jsonb,$6::jsonb,$7,$8)
     returning id`,
    [
      clientId,
      a.title.trim(),
      a.summary || null,
      JSON.stringify(Array.isArray(a.findings) ? a.findings : []),
      JSON.stringify(Array.isArray(a.recommendations) ? a.recommendations : []),
      JSON.stringify(Array.isArray(a.evidence) ? a.evidence : []),
      a.confidence == null ? null : Number(a.confidence),
      agentName,
    ],
  )
  const analysisId = analysisIns.rows[0].id

  // 3. activity (inbound record)
  const act = it.activity || {}
  await client.query(
    `insert into crm_activities (client_id, type, subject, content, source, occurred_at)
     values ($1,'inbound',$2,$3,'agent', now())`,
    [clientId, act.subject || `網站諮詢 #${msgId}`, act.content || null],
  )

  // 4. agent_run (completed audit) — pins contact_message id
  const sourceRefs = [
    { kind: "contact_message", id: String(msgId) },
    { kind: "client", id: String(clientId) },
    { kind: "analysis", id: String(analysisId) },
  ]
  await client.query(
    `insert into crm_agent_runs
       (client_id, analysis_id, agent_name, task_type, status, input, output, source_refs, model, prompt_version, idempotency_key, started_at, completed_at)
     values ($1,$2,$3,'needs_analysis','completed',$4::jsonb,$5::jsonb,$6::jsonb,$7,$8,$9, now(), now())`,
    [
      clientId,
      analysisId,
      agentName,
      JSON.stringify({ messageId: msgId }),
      JSON.stringify({ clientId, analysisId, confidence: a.confidence ?? null }),
      JSON.stringify(sourceRefs),
      model,
      promptVersion,
      idempotencyKey,
    ],
  )

  return { messageId: msgId, skipped: false, clientId, analysisId }
}

const results = []
let saved = 0
let skipped = 0

for (const it of items) {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const r = await saveOne(client, it)
    await client.query("COMMIT")
    results.push(r)
    if (r.skipped) skipped++
    else saved++
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {})
    results.push({ messageId: it?.messageId ?? null, error: err.message })
  } finally {
    client.release()
  }
}

await pool.end()
process.stdout.write(JSON.stringify({ saved, skipped, results }, null, 2) + "\n")
if (results.some((r) => r.error)) process.exitCode = 1

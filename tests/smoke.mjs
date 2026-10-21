import assert from 'node:assert/strict'
import { createHmac, randomBytes } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { userInfo } from 'node:os'
import pg from 'pg'

// Always use a newly-created local database, never DATABASE_URL from .env.local.
const database = `gary_crm_test_${Date.now()}`
const local = new pg.Client({ host: '127.0.0.1', database: 'postgres', connectionTimeoutMillis: 3000 })
const connectionString = `postgresql://${encodeURIComponent(userInfo().username)}@127.0.0.1:5432/${database}`
const secret = randomBytes(32).toString('hex')
const agentToken = randomBytes(32).toString('hex')
const port = 3108
const base = `http://127.0.0.1:${port}`
const env = { ...process.env, DATABASE_URL: connectionString, ADMIN_PASSWORD: 'local-test-only-password', ADMIN_SESSION_SECRET: secret, CRM_AGENT_API_TOKEN: agentToken }
let server, created = false, logs = ''
function session(expires) {
  const payload = String(expires)
  return `admin_session=${payload}.${createHmac('sha256', secret).update(payload).digest('hex')}`
}
const cookie = session(Date.now() + 3600000)
const admin = { cookie }
const agent = { authorization: `Bearer ${agentToken}` }
async function request(path, expected = 200, { headers = admin, method = 'GET', body } = {}) {
  const response = await fetch(base + path, { method, headers: { ...headers, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: 'manual' })
  const text = await response.text()
  assert.equal(response.status, expected, `${method} ${path}: ${text.slice(0, 300)}`)
  assert.ok(!text.includes('data-next-error'), `${path} rendered a server error`)
  console.log(`PASS ${method} ${path} (${expected})`)
  return response.headers.get('content-type')?.includes('application/json') ? JSON.parse(text) : text
}
function jsonScript(path, payload, args = []) {
  const result = spawnSync(process.execPath, [path, ...args], { env, input: payload ? JSON.stringify(payload) : undefined, encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr || result.stdout)
  console.log(`PASS script ${path}`)
  return JSON.parse(result.stdout)
}
function script(path) {
  const result = spawnSync(process.execPath, [path], { env, encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr || result.stdout)
  console.log(result.stdout.trim())
}
try {
  await local.connect()
  await local.query(`CREATE DATABASE "${database}"`)
  created = true
  script('scripts/migrate.mjs')
  script('scripts/migrate.mjs')
  script('scripts/check-db.mjs')
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { env, stdio: ['ignore', 'pipe', 'pipe'] })
  server.stdout.on('data', chunk => { logs = (logs + chunk).slice(-20000) })
  server.stderr.on('data', chunk => { logs = (logs + chunk).slice(-20000) })
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(logs)
    if (logs.includes('Ready in')) break
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  assert.match(logs, /Ready in/)
  await request('/', 200, { headers: {} })
  await request('/admin/login', 200, { headers: {} })
  await request('/admin', 307, { headers: {} })
  await request('/api/crm/clients', 401, { headers: {} })
  await request('/api/crm/clients', 401, { headers: { cookie: session(Date.now() - 1000) } })
  await request('/api/crm/clients', 401, { headers: { cookie: 'admin_session=tampered.signature' } })
  const empty = await request('/api/crm/clients')
  assert.equal(empty.total, 0, 'Test database must start empty')
  const { client } = await request('/api/crm/clients', 201, { method: 'POST', body: { name: 'Smoke Test Client', contactName: 'Test Contact', contactEmail: 'test@example.invalid' } })
  await request(`/api/crm/clients/${client.id}`, 200, { method: 'PATCH', body: { notes: 'Verified update' } })
  await request(`/api/crm/clients/${client.id}/contacts`, 201, { method: 'POST', body: { name: 'Second Contact' } })
  await request('/api/crm/activities', 201, { method: 'POST', body: { clientId: client.id, subject: 'Smoke test note' } })
  const { analysis } = await request('/api/crm/analyses', 201, { method: 'POST', body: { clientId: client.id, title: 'Test needs analysis', type: 'needs', status: 'needs_review', summary: 'Test workflow' } })
  const approved = await request(`/api/crm/analyses/${analysis.id}`, 200, { method: 'PATCH', body: { status: 'approved' } })
  assert.ok(approved.effects.dealCreated)
  assert.ok(approved.effects.pricingRunQueued)
  assert.ok(approved.effects.clientPromoted)
  assert.equal(approved.data.reviewedBy, 'admin')
  await request(`/api/crm/analyses/${analysis.id}`, 409, { method: 'PATCH', body: { status: 'approved' } })
  const { analysis: pricing } = await request('/api/crm/analyses', 201, { method: 'POST', body: { clientId: client.id, dealId: approved.effects.dealId, title: 'Test pricing analysis', type: 'pricing', status: 'needs_review', findings: [{ label: 'recommended_price', detail: 'NT$ 180,000' }] } })
  const priced = await request(`/api/crm/analyses/${pricing.id}`, 200, { method: 'PATCH', body: { status: 'approved' } })
  assert.equal(priced.effects.dealStage, 'proposal')
  assert.equal(Number(priced.effects.dealValue), 180000)
  for (const path of ['/admin', '/admin/today', '/admin/clients', '/admin/clients/new', `/admin/clients/${client.id}`, '/admin/deals', `/admin/deals/${approved.effects.dealId}`, '/admin/analyses', `/admin/analyses/${analysis.id}`, '/admin/inquiries', '/admin/agent-runs']) await request(path)
  for (const path of ['/api/crm/v1/clients', '/api/crm/deals', '/api/crm/analyses', '/api/crm/agent-runs', '/api/crm/change-proposals', '/api/crm/agent-status', '/api/crm/search?q=Smoke', '/api/crm/suggestions', `/api/crm/context/clients/${client.id}`]) await request(path, 200, { headers: agent })
  const search = await request('/api/crm/search', 200, { headers: agent })
  assert.ok(search.items.some(item => item.id === `client-${client.id}`))
  assert.ok(search.items.some(item => item.id === `deal-${approved.effects.dealId}`))
  assert.ok(search.items.some(item => item.id === `analysis-${analysis.id}`))
  const { run } = await request('/api/crm/agent-runs', 201, { headers: agent, method: 'POST', body: { clientId: client.id, agentName: 'smoke-test', taskType: 'needs_analysis', idempotencyKey: 'smoke-run' } })
  const replay = await request('/api/crm/agent-runs', 200, { headers: agent, method: 'POST', body: { clientId: client.id, agentName: 'smoke-test', taskType: 'needs_analysis', idempotencyKey: 'smoke-run' } })
  assert.equal(replay.run.id, run.id)
  assert.equal(replay.idempotentReplay, true)

  // Resource lifecycle and review paths beyond the original happy-path smoke test.
  await request('/api/crm/clients', 400, { method: 'POST', body: { name: '' } })
  const { data: contact } = await request(`/api/crm/clients/${client.id}/contacts`, 201, { method: 'POST', body: { name: 'Lifecycle Contact' } })
  const edited = await request(`/api/crm/contacts/${contact.id}`, 200, { method: 'PATCH', body: { title: 'Updated' } })
  assert.equal(edited.data.title, 'Updated')
  await request(`/api/crm/contacts/${contact.id}`, 200, { method: 'DELETE' })
  await request(`/api/crm/contacts/${contact.id}`, 404, { method: 'DELETE' })
  const { activity } = await request('/api/crm/activities', 201, { method: 'POST', body: { clientId: client.id, subject: 'Task lifecycle', type: 'task' } })
  const completed = await request(`/api/crm/activities/${activity.id}`, 200, { method: 'PATCH', body: { completed: true } })
  assert.ok(completed.data.completedAt)
  const reopened = await request(`/api/crm/activities/${activity.id}`, 200, { method: 'PATCH', body: { completed: false } })
  assert.equal(reopened.data.completedAt, null)
  await request(`/api/crm/activities/${activity.id}`, 200, { method: 'DELETE' })
  const { deal } = await request('/api/crm/deals', 201, { method: 'POST', body: { clientId: client.id, title: 'Lifecycle deal', value: 77000 } })
  for (const stage of ['analysis', 'proposal', 'negotiation', 'won', 'lost']) {
    const updated = await request(`/api/crm/deals/${deal.id}`, 200, { method: 'PATCH', body: { stage } })
    assert.equal(updated.data.stage, stage)
  }
  await request(`/api/crm/deals/${deal.id}`, 200, { method: 'DELETE' })
  const { analysis: market } = await request('/api/crm/analyses', 201, { method: 'POST', body: { clientId: client.id, title: 'Market review', type: 'market' } })
  await request(`/api/crm/analyses/${market.id}`, 200, { method: 'PATCH', body: { status: 'needs_review' } })
  const rejected = await request(`/api/crm/analyses/${market.id}`, 200, { headers: agent, method: 'PATCH', body: { status: 'rejected', reviewedBy: 'spoofed' } })
  assert.equal(rejected.data.reviewedBy, 'agent')
  const version = await request(`/api/crm/analyses/${analysis.id}`, 201, { method: 'PATCH', body: { createVersion: true } })
  assert.equal(version.data.supersedesId, analysis.id)
  assert.equal(version.data.version, 2)
  assert.equal(version.data.status, 'draft')
  const original = await request(`/api/crm/analyses/${analysis.id}`)
  assert.equal(original.data.status, 'superseded')
  for (const status of ['running', 'completed']) {
    const changed = await request(`/api/crm/agent-runs/${run.id}`, 200, { headers: agent, method: 'PATCH', body: { status, output: { tested: true } } })
    assert.equal(changed.data.status, status)
  }
  const makeProposal = async (fields) => (await request('/api/crm/change-proposals', 201, { headers: agent, method: 'POST', body: { agentRunId: run.id, entityType: 'client', operation: 'create', proposedData: { name: 'Proposed Client' }, reason: 'Integration fixture', ...fields } })).proposal
  const proposal = await makeProposal({})
  const applied = await request(`/api/crm/change-proposals/${proposal.id}`, 200, { method: 'PATCH', body: { action: 'approve', reviewedBy: 'spoofed' } })
  assert.equal(applied.data.reviewedBy, 'admin')
  assert.equal(applied.data.status, 'applied')
  await request(`/api/crm/change-proposals/${proposal.id}`, 409, { method: 'PATCH', body: { action: 'approve' } })
  const change = await makeProposal({ operation: 'update', entityId: applied.applied.id, proposedData: { name: 'Renamed Proposal Client' } })
  const changed = await request(`/api/crm/change-proposals/${change.id}`, 200, { method: 'PATCH', body: { action: 'approve' } })
  assert.equal(changed.applied.name, 'Renamed Proposal Client')
  const archive = await makeProposal({ operation: 'archive', entityId: applied.applied.id, proposedData: {} })
  const archived = await request(`/api/crm/change-proposals/${archive.id}`, 200, { method: 'PATCH', body: { action: 'approve' } })
  assert.equal(archived.applied.status, 'archived')
  assert.ok(archived.applied.archivedAt)
  const concurrent = await makeProposal({ proposedData: { name: 'Concurrent review fixture' } })
  const reviews = await Promise.all([1, 2].map(() => fetch(`${base}/api/crm/change-proposals/${concurrent.id}`, { method: 'PATCH', headers: { ...admin, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'approve' }) })))
  assert.deepEqual(reviews.map(response => response.status).sort(), [200, 409])
  await Promise.all(reviews.map(response => response.text()))
  const concurrentClients = await request('/api/crm/clients?q=Concurrent%20review%20fixture')
  assert.equal(concurrentClients.total, 1)
  console.log('PASS concurrent proposal approval applies exactly once')
  const toReject = await makeProposal({})
  const rejection = await request(`/api/crm/change-proposals/${toReject.id}`, 200, { headers: agent, method: 'PATCH', body: { action: 'reject', reviewedBy: 'spoofed' } })
  assert.equal(rejection.data.reviewedBy, 'agent')
  assert.equal(rejection.data.status, 'rejected')
  const unsupported = await makeProposal({ entityType: 'contact' })
  await request(`/api/crm/change-proposals/${unsupported.id}`, 422, { method: 'PATCH', body: { action: 'approve' } })
  const missingTarget = await makeProposal({ operation: 'archive', entityId: 2147483647, proposedData: {} })
  await request(`/api/crm/change-proposals/${missingTarget.id}`, 409, { method: 'PATCH', body: { action: 'approve' } })

  // Complete Hermes script round trip against a real inquiry fixture.
  const fixture = new pg.Client({ connectionString })
  await fixture.connect()
  let inquiryId
  try {
    const result = await fixture.query("INSERT INTO contact_messages(name,email,subject,message) VALUES ('Hermes Fixture','hermes@example.invalid','Workflow test','This is a disposable test inquiry.') RETURNING id")
    inquiryId = result.rows[0].id
  } finally { await fixture.end() }
  const pending = jsonScript('scripts/crm-analyst/fetch-unanalyzed.mjs')
  assert.ok(pending.messages.some(message => message.id === inquiryId))
  const needsPayload = { agentName: 'hermes-test', model: 'fixture-model', promptVersion: 'test-v1', items: [{ messageId: inquiryId, client: { name: 'Hermes Test Lead' }, analysis: { title: 'Hermes needs', summary: 'Fixture needs', confidence: 80 } }] }
  const needs = jsonScript('scripts/crm-analyst/save-analysis.mjs', needsPayload)
  assert.equal(needs.saved, 1)
  const duplicateNeeds = jsonScript('scripts/crm-analyst/save-analysis.mjs', needsPayload)
  assert.equal(duplicateNeeds.skipped, 1)
  const afterNeeds = jsonScript('scripts/crm-analyst/fetch-unanalyzed.mjs')
  assert.ok(!afterNeeds.messages.some(message => message.id === inquiryId))
  const accepted = await request(`/api/crm/analyses/${needs.results[0].analysisId}`, 200, { method: 'PATCH', body: { status: 'approved' } })
  const queue = jsonScript('scripts/crm-analyst/fetch-queued-runs.mjs')
  const queued = queue.runs.find(item => item.runId === accepted.effects.pricingRunId)
  assert.ok(queued)
  assert.equal(queued.needsAnalysis.id, needs.results[0].analysisId)
  const pricePayload = { model: 'fixture-model', items: [{ runId: queued.runId, analysis: { title: 'Hermes pricing', findings: [{ label: 'recommended_price', detail: 'TWD 210,000' }], confidence: 75 } }] }
  const price = jsonScript('scripts/crm-analyst/save-pricing-analysis.mjs', pricePayload)
  assert.equal(price.saved, 1)
  assert.equal(jsonScript('scripts/crm-analyst/save-pricing-analysis.mjs', pricePayload).skipped, 1)
  const pricedHermes = await request(`/api/crm/analyses/${price.results[0].analysisId}`, 200, { method: 'PATCH', body: { status: 'approved' } })
  assert.equal(Number(pricedHermes.effects.dealValue), 210000)
  assert.equal(pricedHermes.effects.dealStage, 'proposal')
  const { run: failRun } = await request('/api/crm/agent-runs', 201, { headers: agent, method: 'POST', body: { clientId: client.id, agentName: 'hermes-test', taskType: 'pricing_analysis', idempotencyKey: 'failure-fixture' } })
  const failed = jsonScript('scripts/crm-analyst/save-pricing-analysis.mjs', { items: [{ runId: failRun.id, error: 'Insufficient information (test)' }] })
  assert.equal(failed.failed, 1)
  const runs = await request('/api/crm/agent-runs')
  assert.equal(runs.runs.find(item => item.id === failRun.id).status, 'failed')
  console.log('PASS complete Hermes script workflow, duplicate guards, and failure reporting')

  console.log('All integration checks passed against the disposable database.')
  if (process.argv.includes('--keep-open')) {
    console.log(`Browser verification ready at ${base}; local-test-only-password. Press Ctrl+C to clean up.`)
    await once(process, 'SIGINT')
  }
} catch (error) {
  console.error(error)
  console.error(logs)
  process.exitCode = 1
} finally {
  if (server && server.exitCode === null) {
    const stopped = once(server, 'exit')
    server.kill('SIGTERM')
    await stopped
  }
  if (created) await local.query(`DROP DATABASE "${database}" WITH (FORCE)`)
  await local.end()
  console.log('Disposable database removed.')
}

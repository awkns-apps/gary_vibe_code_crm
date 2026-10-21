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

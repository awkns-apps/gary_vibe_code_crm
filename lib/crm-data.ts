import { and, desc, eq, getTableColumns, isNull, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  crmActivities,
  crmAnalyses,
  crmClients,
  crmContacts,
  crmDeals,
  crmAgentRuns,
  crmChangeProposals,
} from "@/lib/db/schema"
import {
  analysisStatusLabels,
  analysisTypeLabels,
  clientStatusLabels,
  stageLabels,
} from "@/lib/crm-labels"

export const PAGE_SIZE = 20

export type Paged<T> = { items: T[]; total: number; hasMore: boolean }

/**
 * Rows carry their own grand total via `count(*) over()`, so a page and its
 * count cost one round trip instead of two.
 */
function toPaged<T extends { total?: unknown }>(rows: T[], offset: number): Paged<Omit<T, "total">> {
  const total = rows.length > 0 ? Number(rows[0].total) : 0
  const items = rows.map((row) => {
    const copy: Record<string, unknown> = { ...row }
    delete copy.total
    return copy as Omit<T, "total">
  })
  return { items, total, hasMore: offset + items.length < total }
}

function like(value: string) {
  return `%${value.trim().toLowerCase()}%`
}

/**
 * `to_jsonb(row)` / `json_agg(row)` hand back the raw column names, so a row
 * that arrives this way is snake_case while the rest of the app is camelCase.
 * Only the row's own keys are converted — nested jsonb payloads (tags,
 * findings, agent input) are values and must be left exactly as stored.
 */
function camelizeRow<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    out[key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())] = value
  }
  return out as T
}

function camelizeRows<T>(rows: Array<Record<string, unknown>> | null | undefined): T[] {
  return (rows ?? []).map((row) => camelizeRow<T>(row))
}

/** Just enough to fill a <select>; never drags whole client rows into a form. */
export async function getClientOptions() {
  return db.select({ id: crmClients.id, name: crmClients.name })
    .from(crmClients).where(isNull(crmClients.archivedAt))
    .orderBy(desc(crmClients.updatedAt)).limit(500)
}

export async function getCrmClients({
  query = "",
  limit = PAGE_SIZE,
  offset = 0,
}: { query?: string; limit?: number; offset?: number } = {}) {
  const trimmed = query.trim()
  const filters = [isNull(crmClients.archivedAt)]
  if (trimmed) {
    // Matched in SQL — pulling every client back to filter in JS does not scale.
    filters.push(sql`(
      lower(${crmClients.name}) like ${like(trimmed)}
      or lower(coalesce(${crmClients.industry}, '')) like ${like(trimmed)}
      or lower(${crmClients.tags}::text) like ${like(trimmed)}
    )`)
  }
  const rows = await db.select({ ...getTableColumns(crmClients), total: sql<number>`count(*) over()` })
    .from(crmClients).where(and(...filters))
    .orderBy(desc(crmClients.updatedAt)).limit(limit).offset(offset)
  return toPaged(rows, offset)
}

export async function getAgentDesk({ limit = PAGE_SIZE, offset = 0 }: { limit?: number; offset?: number } = {}) {
  const [runRows, proposals] = await Promise.all([
    db.select({
      run: crmAgentRuns,
      clientName: crmClients.name,
      analysisTitle: crmAnalyses.title,
      total: sql<number>`count(*) over()`,
    }).from(crmAgentRuns)
      .leftJoin(crmClients, eq(crmAgentRuns.clientId, crmClients.id))
      .leftJoin(crmAnalyses, eq(crmAgentRuns.analysisId, crmAnalyses.id))
      .orderBy(desc(crmAgentRuns.createdAt)).limit(limit).offset(offset),
    db.select().from(crmChangeProposals).orderBy(desc(crmChangeProposals.createdAt)).limit(50),
  ])
  return { runs: toPaged(runRows, offset), proposals }
}

type ClientDetail = {
  client: typeof crmClients.$inferSelect
  contacts: Array<typeof crmContacts.$inferSelect>
  deals: Array<typeof crmDeals.$inferSelect>
  activities: Array<typeof crmActivities.$inferSelect>
  activityTotal: number
  analyses: Array<typeof crmAnalyses.$inferSelect>
}

/**
 * One statement for the whole client page. Five parallel queries meant five
 * pooled connections; on a cold function that is five TLS handshakes.
 */
export async function getCrmClient(id: number, { activityLimit = PAGE_SIZE } = {}): Promise<ClientDetail | null> {
  type RawRows = Array<Record<string, unknown>> | null
  const result = await db.execute<{
    client: Record<string, unknown> | null
    contacts: RawRows
    deals: RawRows
    activities: RawRows
    activity_total: number
    analyses: RawRows
  }>(sql`
    select
      to_jsonb(c) as client,
      (select coalesce(json_agg(x order by x.is_primary desc), '[]'::json)
         from crm_contacts x where x.client_id = c.id) as contacts,
      (select coalesce(json_agg(x order by x.updated_at desc), '[]'::json)
         from crm_deals x where x.client_id = c.id) as deals,
      (select coalesce(json_agg(x), '[]'::json) from (
         select * from crm_activities where client_id = c.id
          order by occurred_at desc limit ${activityLimit}) x) as activities,
      (select count(*) from crm_activities where client_id = c.id) as activity_total,
      (select coalesce(json_agg(x order by x.updated_at desc), '[]'::json)
         from crm_analyses x where x.client_id = c.id) as analyses
      from crm_clients c
     where c.id = ${id}
     limit 1
  `)
  const row = result.rows[0]
  if (!row?.client) return null
  return {
    client: camelizeRow<ClientDetail["client"]>(row.client),
    contacts: camelizeRows<ClientDetail["contacts"][number]>(row.contacts),
    deals: camelizeRows<ClientDetail["deals"][number]>(row.deals),
    activities: camelizeRows<ClientDetail["activities"][number]>(row.activities),
    activityTotal: Number(row.activity_total ?? 0),
    analyses: camelizeRows<ClientDetail["analyses"][number]>(row.analyses),
  }
}

export type DashboardData = {
  clientCount: number
  inquiryCount: number
  openDeals: Array<{ id: number; title: string; stage: string; value: string | null }>
  reviewQueue: Array<{ id: number; clientId: number; type: string; title: string; version: number; confidence: number | null }>
  reviewTotal: number
  queuedRunCount: number
  tasks: Array<{ id: number; clientId: number; subject: string; dueAt: string | null }>
}

/** The entire dashboard in a single round trip. */
export async function getCrmDashboard(): Promise<DashboardData> {
  const result = await db.execute<{
    client_count: number
    inquiry_count: number
    open_deals: DashboardData["openDeals"] | null
    review_queue: DashboardData["reviewQueue"] | null
    review_total: number
    queued_run_count: number
    tasks: DashboardData["tasks"] | null
  }>(sql`
    select
      (select count(*) from crm_clients where archived_at is null) as client_count,
      (select count(*) from contact_messages) as inquiry_count,
      (select coalesce(json_agg(x), '[]'::json) from (
         select id, title, stage, value from crm_deals
          where stage not in ('won','lost') order by updated_at desc) x) as open_deals,
      (select coalesce(json_agg(x), '[]'::json) from (
         select id, client_id as "clientId", type, title, version, confidence
           from crm_analyses where status = 'needs_review'
          order by updated_at desc limit 8) x) as review_queue,
      (select count(*) from crm_analyses where status = 'needs_review') as review_total,
      (select count(*) from crm_agent_runs where status = 'queued') as queued_run_count,
      (select coalesce(json_agg(x), '[]'::json) from (
         select id, client_id as "clientId", subject, due_at as "dueAt"
           from crm_activities
          where due_at is not null and completed_at is null
          order by due_at limit 8) x) as tasks
  `)
  const row = result.rows[0]
  return {
    clientCount: Number(row?.client_count ?? 0),
    inquiryCount: Number(row?.inquiry_count ?? 0),
    openDeals: row?.open_deals ?? [],
    reviewQueue: row?.review_queue ?? [],
    reviewTotal: Number(row?.review_total ?? 0),
    queuedRunCount: Number(row?.queued_run_count ?? 0),
    tasks: row?.tasks ?? [],
  }
}

export async function getAllDeals() {
  return db.select({
    id: crmDeals.id,
    clientId: crmDeals.clientId,
    clientName: crmClients.name,
    title: crmDeals.title,
    stage: crmDeals.stage,
    value: crmDeals.value,
    currency: crmDeals.currency,
    probability: crmDeals.probability,
    expectedCloseAt: crmDeals.expectedCloseAt,
  }).from(crmDeals).innerJoin(crmClients, eq(crmDeals.clientId, crmClients.id))
    .orderBy(desc(crmDeals.updatedAt))
}

export async function getAllAnalyses({
  status,
  type,
  limit = PAGE_SIZE,
  offset = 0,
}: { status?: string; type?: string; limit?: number; offset?: number } = {}) {
  const filters = []
  if (status && status !== "all") filters.push(sql`${crmAnalyses.status} = ${status}`)
  if (type && type !== "all") filters.push(sql`${crmAnalyses.type} = ${type}`)

  const rows = await db.select({
    id: crmAnalyses.id,
    clientId: crmAnalyses.clientId,
    clientName: crmClients.name,
    type: crmAnalyses.type,
    title: crmAnalyses.title,
    status: crmAnalyses.status,
    summary: crmAnalyses.summary,
    confidence: crmAnalyses.confidence,
    version: crmAnalyses.version,
    createdBy: crmAnalyses.createdBy,
    updatedAt: crmAnalyses.updatedAt,
    total: sql<number>`count(*) over()`,
  }).from(crmAnalyses).innerJoin(crmClients, eq(crmAnalyses.clientId, crmClients.id))
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(crmAnalyses.updatedAt)).limit(limit).offset(offset)
  return toPaged(rows, offset)
}

/** Status tallies for the analyses filter chips — one cheap grouped query. */
export async function getAnalysisStatusCounts(): Promise<Record<string, number>> {
  const rows = await db.select({ status: crmAnalyses.status, count: sql<number>`count(*)` })
    .from(crmAnalyses).groupBy(crmAnalyses.status)
  const counts: Record<string, number> = { all: 0 }
  for (const row of rows) {
    counts[row.status] = Number(row.count)
    counts.all += Number(row.count)
  }
  return counts
}

export async function getAnalysis(id: number) {
  const [row] = await db.select({
    analysis: crmAnalyses,
    clientName: crmClients.name,
  }).from(crmAnalyses).innerJoin(crmClients, eq(crmAnalyses.clientId, crmClients.id))
    .where(eq(crmAnalyses.id, id)).limit(1)
  if (!row) return null

  const dealId = row.analysis.dealId
  const [deal, runs, siblings] = await Promise.all([
    dealId
      ? db.select().from(crmDeals).where(eq(crmDeals.id, dealId)).limit(1).then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
    // A run is related either because it produced this analysis or because this
    // analysis was its input (the pricing run queued at approval time).
    db.select().from(crmAgentRuns)
      .where(sql`(${crmAgentRuns.analysisId} = ${id} or ${crmAgentRuns.input}->>'needsAnalysisId' = ${String(id)})`)
      .orderBy(desc(crmAgentRuns.createdAt)).limit(10),
    dealId
      ? db.select({
          id: crmAnalyses.id,
          type: crmAnalyses.type,
          title: crmAnalyses.title,
          status: crmAnalyses.status,
          version: crmAnalyses.version,
          confidence: crmAnalyses.confidence,
        }).from(crmAnalyses)
          .where(and(eq(crmAnalyses.dealId, dealId), sql`${crmAnalyses.id} <> ${id}`))
          .orderBy(desc(crmAnalyses.updatedAt)).limit(10)
      : Promise.resolve([]),
  ])

  return { ...row, deal, runs, siblings }
}

export async function getDeal(id: number, { activityLimit = PAGE_SIZE } = {}) {
  const [row] = await db.select({ deal: crmDeals, client: crmClients })
    .from(crmDeals).innerJoin(crmClients, eq(crmDeals.clientId, crmClients.id))
    .where(eq(crmDeals.id, id)).limit(1)
  if (!row) return null

  const [analyses, activities, runs] = await Promise.all([
    db.select().from(crmAnalyses).where(eq(crmAnalyses.dealId, id)).orderBy(desc(crmAnalyses.updatedAt)).limit(20),
    db.select().from(crmActivities).where(eq(crmActivities.dealId, id)).orderBy(desc(crmActivities.occurredAt)).limit(activityLimit),
    db.select().from(crmAgentRuns)
      .where(sql`${crmAgentRuns.input}->>'dealId' = ${String(id)}`)
      .orderBy(desc(crmAgentRuns.createdAt)).limit(10),
  ])

  return { ...row, analyses, activities, runs }
}

type InquiryRow = {
  id: number
  name: string
  email: string
  subject: string
  message: string
  createdAt: Date | string
  clientId: number | null
  clientName: string | null
  analysisId: number | null
  analysisTitle: string | null
  analysisStatus: string | null
  total: number
}

/**
 * The contact inbox, each message carrying what the analyst agent made of it.
 * A message counts as processed when a completed run pins its id in source_refs.
 */
export async function getInquiries({ limit = PAGE_SIZE, offset = 0 } = {}): Promise<Paged<Omit<InquiryRow, "total">> & { processed: number }> {
  const result = await db.execute<InquiryRow & { processed: number }>(sql`
    select cm.id, cm.name, cm.email, cm.subject, cm.message, cm.created_at as "createdAt",
           r.client_id as "clientId", c.name as "clientName",
           r.analysis_id as "analysisId", a.title as "analysisTitle", a.status as "analysisStatus",
           count(*) over() as total,
           count(r.client_id) over() as processed
      from contact_messages cm
      left join lateral (
        select run.* from crm_agent_runs run
         where run.status = 'completed'
           and run.source_refs @> jsonb_build_array(jsonb_build_object('kind','contact_message','id',cm.id::text))
         order by run.created_at desc
         limit 1
      ) r on true
      left join crm_clients c on c.id = r.client_id
      left join crm_analyses a on a.id = r.analysis_id
     order by cm.created_at desc
     limit ${limit} offset ${offset}
  `)
  const processed = result.rows.length > 0 ? Number(result.rows[0].processed) : 0
  return { ...toPaged(result.rows, offset), processed }
}

export type AgentStatus = {
  reviewCount: number
  queuedRuns: number
  failedRuns: number
  pendingProposals: number
  openDealValue: number
  unprocessedInquiries: number
}

/** What the desk agent needs to know to pick a face — one round trip. */
export async function getAgentStatus(): Promise<AgentStatus> {
  const result = await db.execute<Record<string, string>>(sql`
    select
      (select count(*) from crm_analyses where status = 'needs_review') as review_count,
      (select count(*) from crm_agent_runs where status = 'queued') as queued_runs,
      (select count(*) from crm_agent_runs where status = 'failed') as failed_runs,
      (select count(*) from crm_change_proposals where status = 'pending') as pending_proposals,
      (select coalesce(sum(value), 0) from crm_deals where stage not in ('won','lost')) as open_deal_value,
      (select count(*) from contact_messages cm where not exists (
         select 1 from crm_agent_runs r
          where r.status = 'completed'
            and r.source_refs @> jsonb_build_array(jsonb_build_object('kind','contact_message','id',cm.id::text))
       )) as unprocessed_inquiries
  `)
  const row = result.rows[0] ?? {}
  return {
    reviewCount: Number(row.review_count ?? 0),
    queuedRuns: Number(row.queued_runs ?? 0),
    failedRuns: Number(row.failed_runs ?? 0),
    pendingProposals: Number(row.pending_proposals ?? 0),
    openDealValue: Number(row.open_deal_value ?? 0),
    unprocessedInquiries: Number(row.unprocessed_inquiries ?? 0),
  }
}

export type SuggestionGroup = { label: string; items: SearchItem[] }

/**
 * What the desk offers before you type anything. Ordered the same way the
 * agent picks a face: things needing a person first, then what you were last
 * looking at. An empty query is not an empty screen.
 */
export async function getDeskSuggestions(): Promise<SuggestionGroup[]> {
  // `extra` carries a raw enum (deal stage) so it can be localised in JS rather
  // than concatenated raw into the subtitle.
  const result = await db.execute<{
    bucket: string; row_id: number; kind: string; title: string; subtitle: string; extra: string | null
  }>(sql`
    (select 'decide' as bucket, a.id as row_id, 'analysis' as kind, a.title,
            c.name || ' · ' || coalesce(a.confidence::text || '%', '未評估') as subtitle,
            null::text as extra, a.updated_at as sort_at
       from crm_analyses a join crm_clients c on c.id = a.client_id
      where a.status = 'needs_review'
      order by a.updated_at desc limit 5)
    union all
    (select 'decide', p.id, 'proposal', p.operation || ' ' || p.entity_type, p.reason, null, p.created_at
       from crm_change_proposals p where p.status = 'pending' limit 3)
    union all
    (select 'decide', r.id, 'run', r.agent_name, coalesce(r.error, r.task_type), null, r.created_at
       from crm_agent_runs r where r.status = 'failed' limit 3)
    union all
    (select 'recent', d.id, 'deal', d.title, c2.name, d.stage::text, d.updated_at
       from crm_deals d join crm_clients c2 on c2.id = d.client_id
      order by d.updated_at desc limit 3)
    union all
    (select 'recent', c3.id, 'client', c3.name, coalesce(c3.industry, 'CRM 客戶'), null, c3.updated_at
       from crm_clients c3 where c3.archived_at is null
      order by c3.updated_at desc limit 3)
    order by sort_at desc
  `)

  const href: Record<string, (id: number) => string> = {
    analysis: (id) => `/admin/analyses/${id}`,
    deal: (id) => `/admin/deals/${id}`,
    client: (id) => `/admin/clients/${id}`,
    proposal: () => "/admin/agent-runs",
    run: () => "/admin/agent-runs",
  }
  const kindLabel: Record<string, string> = {
    analysis: "待審分析", proposal: "待決變更", run: "執行失敗", deal: "商機", client: "客戶",
  }

  const decide: SearchItem[] = []
  const recent: SearchItem[] = []
  for (const row of result.rows) {
    const stage = row.extra ? stageLabels[row.extra] ?? row.extra : null
    const item: SearchItem = {
      id: `${row.kind}-${row.row_id}`,
      kind: kindLabel[row.kind] ?? row.kind,
      title: row.title,
      subtitle: [row.subtitle, stage].filter(Boolean).join(" · "),
      href: href[row.kind](row.row_id),
    }
    ;(row.bucket === "decide" ? decide : recent).push(item)
  }

  return [
    { label: "等你決定", items: decide },
    { label: "最近開啟", items: recent },
  ].filter((group) => group.items.length > 0)
}

export type SearchItem = { id: string; kind: string; title: string; subtitle: string; href: string }

/** Everything addressable, flattened for the command palette — one round trip. */
export async function getSearchIndex(limit = 300): Promise<SearchItem[]> {
  const result = await db.execute<{
    kind: string
    row_id: number
    title: string
    a: string | null
    b: string | null
    c: string | null
  }>(sql`
    (select 'client' as kind, c.id as row_id, c.name as title,
            c.industry as a, c.status::text as b, null::text as c, c.updated_at as sort_at
       from crm_clients c where c.archived_at is null)
    union all
    (select 'deal', d.id, d.title, cl.name, d.stage::text,
            case when d.value is null then null else d.currency || ' ' || trim(to_char(d.value, 'FM999,999,999,990')) end,
            d.updated_at
       from crm_deals d join crm_clients cl on cl.id = d.client_id)
    union all
    (select 'analysis', an.id, an.title, cl2.name, an.type::text, an.status::text, an.updated_at
       from crm_analyses an join crm_clients cl2 on cl2.id = an.client_id)
    order by sort_at desc
    limit ${limit}
  `)

  return result.rows.map((row) => {
    if (row.kind === "client") {
      return {
        id: `client-${row.row_id}`, kind: "客戶", title: row.title,
        subtitle: [row.a, row.b ? clientStatusLabels[row.b] ?? row.b : null].filter(Boolean).join(" · "),
        href: `/admin/clients/${row.row_id}`,
      }
    }
    if (row.kind === "deal") {
      return {
        id: `deal-${row.row_id}`, kind: "商機", title: row.title,
        subtitle: [row.a, row.b ? stageLabels[row.b] ?? row.b : null, row.c].filter(Boolean).join(" · "),
        href: `/admin/deals/${row.row_id}`,
      }
    }
    return {
      id: `analysis-${row.row_id}`, kind: "分析", title: row.title,
      subtitle: [row.a, row.b ? analysisTypeLabels[row.b] ?? row.b : null, row.c ? analysisStatusLabels[row.c] ?? row.c : null].filter(Boolean).join(" · "),
      href: `/admin/analyses/${row.row_id}`,
    }
  })
}

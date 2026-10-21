import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  crmActivities,
  crmAgentRuns,
  crmAnalyses,
  crmClients,
  crmDeals,
} from "@/lib/db/schema"

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]
type Analysis = typeof crmAnalyses.$inferSelect

export const PRICING_AGENT_NAME = "crm-pricing-analyst"
export const PRICING_TASK_TYPE = "pricing_analysis"

export type ApprovalEffects = {
  dealId: number | null
  dealCreated: boolean
  dealStage: string | null
  clientPromoted: boolean
  pricingRunId: number | null
  pricingRunQueued: boolean
  dealValue: string | null
  notes: string[]
}

const emptyEffects = (): ApprovalEffects => ({
  dealId: null,
  dealCreated: false,
  dealStage: null,
  clientPromoted: false,
  pricingRunId: null,
  pricingRunQueued: false,
  dealValue: null,
  notes: [],
})

/** "旅行社行程詢問回覆自動化需求分析" -> "旅行社行程詢問回覆自動化" */
export function dealTitleFromAnalysis(title: string): string {
  const stripped = title.replace(/\s*需求分析\s*$/, "").trim()
  return stripped || title.trim()
}

/** Pulls a numeric amount out of a pricing finding such as "NT$ 180,000 一次性". */
export function parseAmount(detail: string): string | null {
  const match = detail.match(/\d[\d,]*(\.\d+)?/)
  if (!match) return null
  const value = Number(match[0].replaceAll(",", ""))
  if (!Number.isFinite(value) || value <= 0) return null
  return value.toFixed(2)
}

async function promoteClient(tx: Tx, clientId: number, effects: ApprovalEffects) {
  const promoted = await tx.update(crmClients)
    .set({ status: "qualified", lastInteractionAt: new Date(), updatedAt: new Date() })
    .where(and(eq(crmClients.id, clientId), eq(crmClients.status, "lead")))
    .returning({ id: crmClients.id })
  if (promoted.length > 0) effects.clientPromoted = true
}

/**
 * Approving a needs analysis opens the pipeline:
 *   1. attach (or create) the deal this analysis belongs to, at stage `analysis`
 *   2. promote the client out of `lead`
 *   3. queue a pricing run for the cron agent to pick up
 *   4. leave a timeline entry
 */
async function approveNeedsAnalysis(tx: Tx, analysis: Analysis, actor: string): Promise<ApprovalEffects> {
  const effects = emptyEffects()

  let dealId = analysis.dealId
  if (dealId) {
    const [existing] = await tx.select().from(crmDeals).where(eq(crmDeals.id, dealId)).limit(1)
    if (existing) {
      effects.dealStage = existing.stage
      if (existing.stage === "discovery") {
        const [moved] = await tx.update(crmDeals)
          .set({ stage: "analysis", updatedAt: new Date() })
          .where(eq(crmDeals.id, dealId)).returning()
        effects.dealStage = moved.stage
      }
    } else {
      dealId = null
      effects.notes.push("原本連結的商機已不存在，改為建立新的商機。")
    }
  }

  if (!dealId) {
    const [created] = await tx.insert(crmDeals).values({
      clientId: analysis.clientId,
      title: dealTitleFromAnalysis(analysis.title),
      stage: "analysis",
      probability: 40,
      scope: analysis.summary,
    }).returning()
    dealId = created.id
    effects.dealCreated = true
    effects.dealStage = created.stage
  }

  effects.dealId = dealId
  await tx.update(crmAnalyses)
    .set({ dealId, updatedAt: new Date() })
    .where(eq(crmAnalyses.id, analysis.id))

  await promoteClient(tx, analysis.clientId, effects)

  // 3. queue the pricing run. The unique idempotency key means re-approving a
  //    superseded/re-approved analysis will never double-queue.
  const idempotencyKey = `${PRICING_TASK_TYPE}-${analysis.id}`
  const [queued] = await tx.insert(crmAgentRuns).values({
    clientId: analysis.clientId,
    analysisId: analysis.id,
    agentName: PRICING_AGENT_NAME,
    taskType: PRICING_TASK_TYPE,
    status: "queued",
    input: { needsAnalysisId: analysis.id, clientId: analysis.clientId, dealId },
    sourceRefs: [
      { kind: "analysis", id: String(analysis.id) },
      { kind: "client", id: String(analysis.clientId) },
      { kind: "deal", id: String(dealId) },
    ],
    promptVersion: "pricing-v1",
    idempotencyKey,
  }).onConflictDoNothing({ target: crmAgentRuns.idempotencyKey }).returning()

  if (queued) {
    effects.pricingRunId = queued.id
    effects.pricingRunQueued = true
  } else {
    const [existingRun] = await tx.select({ id: crmAgentRuns.id })
      .from(crmAgentRuns).where(eq(crmAgentRuns.idempotencyKey, idempotencyKey)).limit(1)
    effects.pricingRunId = existingRun?.id ?? null
    effects.notes.push("報價分析先前已排入佇列，未重複排程。")
  }

  await tx.insert(crmActivities).values({
    clientId: analysis.clientId,
    dealId,
    type: "note",
    subject: `需求分析已核准：${analysis.title}`,
    content: effects.dealCreated
      ? "核准後自動建立商機並排入報價分析。"
      : "核准後已連結既有商機並排入報價分析。",
    source: actor === "agent" ? "agent" : "human",
  })

  return effects
}

/**
 * Approving a pricing analysis closes the loop: the deal moves to `proposal`
 * and picks up the recommended price the analysis landed on.
 */
async function approvePricingAnalysis(tx: Tx, analysis: Analysis, actor: string): Promise<ApprovalEffects> {
  const effects = emptyEffects()
  effects.dealId = analysis.dealId

  if (!analysis.dealId) {
    effects.notes.push("這份報價分析沒有連結商機，未更新管線。")
    return effects
  }

  const [deal] = await tx.select().from(crmDeals).where(eq(crmDeals.id, analysis.dealId)).limit(1)
  if (!deal) {
    effects.notes.push("連結的商機已不存在，未更新管線。")
    return effects
  }

  const recommended = analysis.findings.find((finding) => finding.label === "recommended_price")
  const value = recommended ? parseAmount(recommended.detail) : null
  if (recommended && !value) effects.notes.push("找不到可解析的建議報價金額，商機金額維持原值。")
  if (!recommended) effects.notes.push("分析中沒有 recommended_price，商機金額維持原值。")

  const [updated] = await tx.update(crmDeals).set({
    stage: deal.stage === "won" || deal.stage === "lost" ? deal.stage : "proposal",
    value: value ?? deal.value,
    probability: deal.probability < 60 ? 60 : deal.probability,
    pricingNotes: analysis.summary ?? deal.pricingNotes,
    updatedAt: new Date(),
  }).where(eq(crmDeals.id, deal.id)).returning()

  effects.dealStage = updated.stage
  effects.dealValue = updated.value

  await promoteClient(tx, analysis.clientId, effects)

  await tx.insert(crmActivities).values({
    clientId: analysis.clientId,
    dealId: deal.id,
    type: "note",
    subject: `報價分析已核准：${analysis.title}`,
    content: value
      ? `商機金額更新為 ${updated.currency} ${Number(value).toLocaleString("zh-TW")}，階段推進到提案。`
      : "商機階段推進到提案。",
    source: actor === "agent" ? "agent" : "human",
  })

  return effects
}

/** Side effects that fire the moment an analysis first reaches `approved`. */
export async function applyApprovalEffects(tx: Tx, analysis: Analysis, actor: string): Promise<ApprovalEffects> {
  if (analysis.type === "needs") return approveNeedsAnalysis(tx, analysis, actor)
  if (analysis.type === "pricing") return approvePricingAnalysis(tx, analysis, actor)
  const effects = emptyEffects()
  effects.dealId = analysis.dealId
  effects.notes.push("市場調查核准不會變更商機管線。")
  return effects
}

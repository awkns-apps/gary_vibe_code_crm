import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { getApiActor, requireApiAdmin } from "@/lib/api-auth"
import { applyApprovalEffects, type ApprovalEffects } from "@/lib/crm-approval"
import { db } from "@/lib/db"
import { crmAnalyses } from "@/lib/db/schema"
type C = { params: Promise<{ id: string }> }

const STATUSES = ["draft", "needs_review", "approved", "superseded", "rejected"] as const
type Status = (typeof STATUSES)[number]

export async function GET(request: Request, { params }: C) {
  const denied = await requireApiAdmin(request); if (denied) return denied
  const [analysis] = await db.select().from(crmAnalyses).where(eq(crmAnalyses.id, Number((await params).id))).limit(1)
  return analysis ? NextResponse.json({ data: analysis }) : NextResponse.json({ error: { code: "NOT_FOUND", message: "Analysis not found" } }, { status: 404 })
}

export async function PATCH(request: Request, { params }: C) {
  const denied = await requireApiAdmin(request); if (denied) return denied
  const actor = await getApiActor(request)
  const id = Number((await params).id), body = await request.json()
  const [current] = await db.select().from(crmAnalyses).where(eq(crmAnalyses.id, id)).limit(1)
  if (!current) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Analysis not found" } }, { status: 404 })
  if (current.status === "approved" && !body.createVersion) return NextResponse.json({ error: { code: "IMMUTABLE_APPROVED", message: "Create a new version of an approved analysis" } }, { status: 409 })
  if (body.status !== undefined && !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: `status must be one of ${STATUSES.join(", ")}` } }, { status: 400 })
  }
  if (body.createVersion) {
    const [created] = await db.insert(crmAnalyses).values({ clientId: current.clientId, dealId: current.dealId, type: current.type, title: body.title || current.title, status: "draft", summary: body.summary ?? current.summary, findings: body.findings ?? current.findings, recommendations: body.recommendations ?? current.recommendations, evidence: body.evidence ?? current.evidence, confidence: body.confidence ?? current.confidence, version: current.version + 1, supersedesId: current.id, createdBy: actor }).returning()
    await db.update(crmAnalyses).set({ status: "superseded", updatedAt: new Date() }).where(eq(crmAnalyses.id, id))
    return NextResponse.json({ data: created }, { status: 201 })
  }

  // Reviewer identity and timestamp are server-derived — never taken from the body.
  const status = body.status as Status | undefined
  const isReview = status === "approved" || status === "rejected"
  const becomesApproved = status === "approved" && current.status !== "approved"

  const { updated, effects } = await db.transaction(async (tx) => {
    const [row] = await tx.update(crmAnalyses).set({
      title: body.title,
      status,
      summary: body.summary,
      findings: body.findings,
      recommendations: body.recommendations,
      evidence: body.evidence,
      confidence: body.confidence,
      reviewedBy: isReview ? actor : undefined,
      reviewedAt: isReview ? new Date() : undefined,
      updatedAt: new Date(),
    }).where(eq(crmAnalyses.id, id)).returning()

    const applied: ApprovalEffects | null = becomesApproved ? await applyApprovalEffects(tx, current, actor) : null
    if (!applied) return { updated: row, effects: null }

    // dealId may have just been attached by the approval effects.
    const [fresh] = await tx.select().from(crmAnalyses).where(eq(crmAnalyses.id, id)).limit(1)
    return { updated: fresh ?? row, effects: applied }
  })

  return NextResponse.json(effects ? { data: updated, effects } : { data: updated })
}

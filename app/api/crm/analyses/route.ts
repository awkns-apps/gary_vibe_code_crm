import { NextResponse } from "next/server"
import { requireApiAdmin } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { crmAgentRuns, crmAnalyses } from "@/lib/db/schema"
import { getAllAnalyses } from "@/lib/crm-data"

export async function GET(request: Request) {
  const unauthorized = await requireApiAdmin(request)
  if (unauthorized) return unauthorized
  const url = new URL(request.url)
  const { items, total, hasMore } = await getAllAnalyses({
    status: url.searchParams.get("status") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
    limit: Math.min(200, Number(url.searchParams.get("limit")) || 50),
    offset: Math.max(0, Number(url.searchParams.get("offset")) || 0),
  })
  return NextResponse.json({ analyses: items, total, hasMore })
}

export async function POST(request: Request) {
  const unauthorized = await requireApiAdmin(request)
  if (unauthorized) return unauthorized
  const body = await request.json()
  if (!body.clientId || !body.type || !String(body.title ?? "").trim()) {
    return NextResponse.json({ error: "clientId、type 與 title 為必填" }, { status: 400 })
  }
  const [analysis] = await db.insert(crmAnalyses).values({
    clientId: Number(body.clientId),
    dealId: body.dealId ? Number(body.dealId) : null,
    type: body.type,
    title: String(body.title).trim(),
    status: body.status || "draft",
    summary: body.summary || null,
    findings: Array.isArray(body.findings) ? body.findings : [],
    recommendations: Array.isArray(body.recommendations) ? body.recommendations : [],
    evidence: Array.isArray(body.evidence) ? body.evidence : [],
    confidence: body.confidence == null ? null : Number(body.confidence),
    createdBy: body.createdBy || "human",
  }).returning()
  return NextResponse.json({ analysis }, { status: 201 })
}

// Agent webhook: create an auditable run before another agent starts processing.
export async function PUT(request: Request) {
  const unauthorized = await requireApiAdmin(request)
  if (unauthorized) return unauthorized
  const body = await request.json()
  if (!body.agentName || !body.taskType || !body.idempotencyKey) {
    return NextResponse.json({ error: "agentName、taskType 與 idempotencyKey 為必填" }, { status: 400 })
  }
  const [run] = await db.insert(crmAgentRuns).values({
    clientId: body.clientId ? Number(body.clientId) : null,
    analysisId: body.analysisId ? Number(body.analysisId) : null,
    agentName: body.agentName,
    taskType: body.taskType,
    status: body.status || "queued",
    input: body.input || {},
    output: body.output || null,
    sourceRefs: body.sourceRefs || [],
    model: body.model || null,
    promptVersion: body.promptVersion || null,
    idempotencyKey: body.idempotencyKey,
    startedAt: body.startedAt ? new Date(body.startedAt) : null,
    completedAt: body.completedAt ? new Date(body.completedAt) : null,
    error: body.error || null,
  }).returning()
  return NextResponse.json({ run }, { status: 201 })
}

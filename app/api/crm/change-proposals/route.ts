import { desc } from "drizzle-orm"
import { NextResponse } from "next/server"
import { requireApiAdmin } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { crmChangeProposals } from "@/lib/db/schema"

export async function GET(request: Request) {
  const unauthorized = await requireApiAdmin(request); if (unauthorized) return unauthorized
  return NextResponse.json({ proposals: await db.select().from(crmChangeProposals).orderBy(desc(crmChangeProposals.createdAt)).limit(100) })
}
export async function POST(request: Request) {
  const unauthorized = await requireApiAdmin(request); if (unauthorized) return unauthorized
  const body = await request.json()
  if (!body.agentRunId || !body.entityType || !body.operation || !body.proposedData || !body.reason) return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 })
  const [proposal] = await db.insert(crmChangeProposals).values({ agentRunId: body.agentRunId, entityType: body.entityType, entityId: body.entityId || null, operation: body.operation, proposedData: body.proposedData, currentSnapshot: body.currentSnapshot || null, reason: body.reason, confidence: body.confidence ?? null }).returning()
  return NextResponse.json({ proposal }, { status: 201 })
}

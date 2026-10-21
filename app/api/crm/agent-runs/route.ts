import { desc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { requireApiAdmin } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { crmAgentRuns } from "@/lib/db/schema"

export async function GET(request: Request) {
  const unauthorized = await requireApiAdmin(request); if (unauthorized) return unauthorized
  return NextResponse.json({ runs: await db.select().from(crmAgentRuns).orderBy(desc(crmAgentRuns.createdAt)).limit(100) })
}
export async function POST(request: Request) {
  const unauthorized = await requireApiAdmin(request); if (unauthorized) return unauthorized
  const body = await request.json()
  if (!body.agentName || !body.taskType || !body.idempotencyKey) return NextResponse.json({ error: "agentName、taskType、idempotencyKey 為必填" }, { status: 400 })
  const existing = await db.select().from(crmAgentRuns).where(eq(crmAgentRuns.idempotencyKey, body.idempotencyKey)).limit(1)
  if (existing[0]) return NextResponse.json({ run: existing[0], idempotentReplay: true })
  const [run] = await db.insert(crmAgentRuns).values({ clientId: body.clientId || null, agentName: body.agentName, taskType: body.taskType, idempotencyKey: body.idempotencyKey, input: body.input || {}, sourceRefs: body.sourceRefs || [], model: body.model || null, promptVersion: body.promptVersion || null }).returning()
  return NextResponse.json({ run }, { status: 201 })
}

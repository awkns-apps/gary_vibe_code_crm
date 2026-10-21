import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { requireApiAdmin } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { crmAgentRuns } from "@/lib/db/schema"
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireApiAdmin(request); if (denied) return denied
  const body = await request.json()
  const [run] = await db.update(crmAgentRuns).set({ status: body.status, output: body.output, error: body.error, analysisId: body.analysisId, startedAt: body.startedAt ? new Date(body.startedAt) : undefined, completedAt: body.completedAt ? new Date(body.completedAt) : ["completed", "failed", "cancelled"].includes(body.status) ? new Date() : undefined }).where(eq(crmAgentRuns.id, Number((await params).id))).returning()
  return run ? NextResponse.json({ data: run }) : NextResponse.json({ error: { code: "NOT_FOUND", message: "Run not found" } }, { status: 404 })
}

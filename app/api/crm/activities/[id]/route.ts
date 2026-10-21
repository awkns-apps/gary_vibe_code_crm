import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { requireApiAdmin } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { crmActivities } from "@/lib/db/schema"
type C = { params: Promise<{ id: string }> }
export async function PATCH(request: Request, { params }: C) {
  const denied = await requireApiAdmin(request); if (denied) return denied
  const body = await request.json()
  const values = { ...body, dueAt: body.dueAt ? new Date(body.dueAt) : undefined, completedAt: body.completed === true ? new Date() : body.completed === false ? null : undefined }
  const [activity] = await db.update(crmActivities).set(values).where(eq(crmActivities.id, Number((await params).id))).returning()
  return activity ? NextResponse.json({ data: activity }) : NextResponse.json({ error: { code: "NOT_FOUND", message: "Activity not found" } }, { status: 404 })
}
export async function DELETE(request: Request, { params }: C) {
  const denied = await requireApiAdmin(request); if (denied) return denied
  const [activity] = await db.delete(crmActivities).where(eq(crmActivities.id, Number((await params).id))).returning()
  return activity ? NextResponse.json({ data: activity }) : NextResponse.json({ error: { code: "NOT_FOUND", message: "Activity not found" } }, { status: 404 })
}

import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { requireApiAdmin } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { crmDeals } from "@/lib/db/schema"
type C = { params: Promise<{ id: string }> }
export async function PATCH(request: Request, { params }: C) {
  const denied = await requireApiAdmin(request); if (denied) return denied
  const body = await request.json()
  const [deal] = await db.update(crmDeals).set({ ...body, value: body.value === undefined ? undefined : String(body.value), expectedCloseAt: body.expectedCloseAt ? new Date(body.expectedCloseAt) : undefined, updatedAt: new Date() }).where(eq(crmDeals.id, Number((await params).id))).returning()
  return deal ? NextResponse.json({ data: deal }) : NextResponse.json({ error: { code: "NOT_FOUND", message: "Deal not found" } }, { status: 404 })
}
export async function DELETE(request: Request, { params }: C) {
  const denied = await requireApiAdmin(request); if (denied) return denied
  const [deal] = await db.delete(crmDeals).where(eq(crmDeals.id, Number((await params).id))).returning()
  return deal ? NextResponse.json({ data: deal }) : NextResponse.json({ error: { code: "NOT_FOUND", message: "Deal not found" } }, { status: 404 })
}

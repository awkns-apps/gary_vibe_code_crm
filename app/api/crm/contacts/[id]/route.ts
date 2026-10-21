import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { requireApiAdmin } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { crmContacts } from "@/lib/db/schema"
type C = { params: Promise<{ id: string }> }
export async function PATCH(request: Request, { params }: C) {
  const denied = await requireApiAdmin(request); if (denied) return denied
  const body = await request.json()
  const [contact] = await db.update(crmContacts).set({ ...body, updatedAt: new Date() }).where(eq(crmContacts.id, Number((await params).id))).returning()
  return contact ? NextResponse.json({ data: contact }) : NextResponse.json({ error: { code: "NOT_FOUND", message: "Contact not found" } }, { status: 404 })
}
export async function DELETE(request: Request, { params }: C) {
  const denied = await requireApiAdmin(request); if (denied) return denied
  const [contact] = await db.delete(crmContacts).where(eq(crmContacts.id, Number((await params).id))).returning()
  return contact ? NextResponse.json({ data: contact }) : NextResponse.json({ error: { code: "NOT_FOUND", message: "Contact not found" } }, { status: 404 })
}

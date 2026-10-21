import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { requireApiAdmin } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { crmContacts } from "@/lib/db/schema"
type C = { params: Promise<{ id: string }> }
export async function GET(request: Request, { params }: C) {
  const denied = await requireApiAdmin(request); if (denied) return denied
  return NextResponse.json({ data: await db.select().from(crmContacts).where(eq(crmContacts.clientId, Number((await params).id))) })
}
export async function POST(request: Request, { params }: C) {
  const denied = await requireApiAdmin(request); if (denied) return denied
  const body = await request.json()
  if (!String(body.name || "").trim()) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "name is required" } }, { status: 400 })
  const [contact] = await db.insert(crmContacts).values({ clientId: Number((await params).id), name: body.name, title: body.title || null, department: body.department || null, email: body.email || null, phone: body.phone || null, linkedinUrl: body.linkedinUrl || null, isPrimary: Boolean(body.isPrimary), notes: body.notes || null }).returning()
  return NextResponse.json({ data: contact }, { status: 201 })
}

import { NextResponse } from "next/server"
import { requireApiAdmin } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { crmActivities, crmClients } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function POST(request: Request) {
  const unauthorized = await requireApiAdmin(request)
  if (unauthorized) return unauthorized
  const body = await request.json()
  if (!body.clientId || !String(body.subject ?? "").trim()) {
    return NextResponse.json({ error: "clientId 與 subject 為必填" }, { status: 400 })
  }
  const [activity] = await db.insert(crmActivities).values({
    clientId: Number(body.clientId),
    dealId: body.dealId ? Number(body.dealId) : null,
    type: body.type || "note",
    subject: String(body.subject).trim(),
    content: body.content || null,
    source: body.source || "human",
    occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
    dueAt: body.dueAt ? new Date(body.dueAt) : null,
  }).returning()
  await db.update(crmClients).set({ lastInteractionAt: new Date(), updatedAt: new Date() })
    .where(eq(crmClients.id, Number(body.clientId)))
  return NextResponse.json({ activity }, { status: 201 })
}

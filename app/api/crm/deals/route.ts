import { NextResponse } from "next/server"
import { requireApiAdmin } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { crmDeals } from "@/lib/db/schema"
import { getAllDeals } from "@/lib/crm-data"

export async function GET() {
  const unauthorized = await requireApiAdmin()
  if (unauthorized) return unauthorized
  return NextResponse.json({ deals: await getAllDeals() })
}

export async function POST(request: Request) {
  const unauthorized = await requireApiAdmin()
  if (unauthorized) return unauthorized
  const body = await request.json()
  if (!body.clientId || !String(body.title ?? "").trim()) {
    return NextResponse.json({ error: "clientId 與 title 為必填" }, { status: 400 })
  }
  const [deal] = await db.insert(crmDeals).values({
    clientId: Number(body.clientId),
    title: String(body.title).trim(),
    stage: body.stage || "discovery",
    value: body.value ? String(body.value) : null,
    currency: body.currency || "TWD",
    probability: Number(body.probability ?? 20),
    expectedCloseAt: body.expectedCloseAt ? new Date(body.expectedCloseAt) : null,
    scope: body.scope || null,
    pricingNotes: body.pricingNotes || null,
  }).returning()
  return NextResponse.json({ deal }, { status: 201 })
}

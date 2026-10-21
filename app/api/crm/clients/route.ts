import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { crmClients, crmContacts } from "@/lib/db/schema"
import { requireApiAdmin } from "@/lib/api-auth"
import { getClientOptions, getCrmClients } from "@/lib/crm-data"

export async function GET(request: Request) {
  const unauthorized = await requireApiAdmin(request)
  if (unauthorized) return unauthorized
  const url = new URL(request.url)
  // Forms only need id+name, and only once the user opens them.
  if (url.searchParams.get("fields") === "options") {
    return NextResponse.json({ clients: await getClientOptions() })
  }
  const { items, total, hasMore } = await getCrmClients({
    query: url.searchParams.get("q") ?? "",
    limit: Math.min(200, Number(url.searchParams.get("limit")) || 50),
    offset: Math.max(0, Number(url.searchParams.get("offset")) || 0),
  })
  return NextResponse.json({ clients: items, total, hasMore })
}

export async function POST(request: Request) {
  const unauthorized = await requireApiAdmin(request)
  if (unauthorized) return unauthorized

  const body = await request.json()
  const name = String(body.name ?? "").trim()
  if (!name) return NextResponse.json({ error: "客戶名稱為必填" }, { status: 400 })

  const [client] = await db.insert(crmClients).values({
    name,
    legalName: body.legalName || null,
    clientType: body.clientType || "company",
    industry: body.industry || null,
    website: body.website || null,
    source: body.source || null,
    status: body.status || "lead",
    owner: body.owner || null,
    tags: Array.isArray(body.tags) ? body.tags : [],
    summary: body.summary || null,
    notes: body.notes || null,
    nextAction: body.nextAction || null,
    nextActionAt: body.nextActionAt ? new Date(body.nextActionAt) : null,
  }).returning()

  if (body.contactName) {
    await db.insert(crmContacts).values({
      clientId: client.id,
      name: body.contactName,
      email: body.contactEmail || null,
      phone: body.contactPhone || null,
      title: body.contactTitle || null,
      isPrimary: true,
    })
  }

  return NextResponse.json({ client }, { status: 201 })
}

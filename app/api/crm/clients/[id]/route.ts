import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { requireApiAdmin } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { crmClients } from "@/lib/db/schema"
import { getCrmClient } from "@/lib/crm-data"

type Context = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Context) {
  const unauthorized = await requireApiAdmin(request)
  if (unauthorized) return unauthorized
  const id = Number((await params).id)
  const data = await getCrmClient(id)
  return data
    ? NextResponse.json(data)
    : NextResponse.json({ error: "Not found" }, { status: 404 })
}

export async function PATCH(request: Request, { params }: Context) {
  const unauthorized = await requireApiAdmin(request)
  if (unauthorized) return unauthorized
  const id = Number((await params).id)
  const body = await request.json()
  const allowed = {
    name: body.name,
    legalName: body.legalName,
    clientType: body.clientType,
    industry: body.industry,
    website: body.website,
    source: body.source,
    status: body.status,
    owner: body.owner,
    tags: body.tags,
    summary: body.summary,
    notes: body.notes,
    nextAction: body.nextAction,
    nextActionAt: body.nextActionAt ? new Date(body.nextActionAt) : null,
    updatedAt: new Date(),
  }
  const values = Object.fromEntries(Object.entries(allowed).filter(([, value]) => value !== undefined))
  const [client] = await db.update(crmClients).set(values).where(eq(crmClients.id, id)).returning()
  return client ? NextResponse.json({ client }) : NextResponse.json({ error: "Not found" }, { status: 404 })
}

export async function DELETE(request: Request, { params }: Context) {
  const unauthorized = await requireApiAdmin(request)
  if (unauthorized) return unauthorized
  const id = Number((await params).id)
  const [client] = await db.update(crmClients).set({
    status: "archived",
    archivedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(crmClients.id, id)).returning()
  return client ? NextResponse.json({ client }) : NextResponse.json({ error: "Not found" }, { status: 404 })
}

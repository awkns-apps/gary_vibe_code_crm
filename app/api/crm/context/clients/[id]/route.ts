import { NextResponse } from "next/server"
import { requireApiAdmin } from "@/lib/api-auth"
import { getCrmClient } from "@/lib/crm-data"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireApiAdmin(); if (unauthorized) return unauthorized
  const data = await getCrmClient(Number((await params).id))
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ data, meta: { purpose: "agent_context", generatedAt: new Date().toISOString() } })
}

import { NextResponse } from "next/server"
import { requireApiAdmin } from "@/lib/api-auth"
import { getSearchIndex } from "@/lib/crm-data"

export const dynamic = "force-dynamic"

/** Flat index of every addressable record, for the command palette. */
export async function GET(request: Request) {
  const denied = await requireApiAdmin(request)
  if (denied) return denied
  return NextResponse.json({ items: await getSearchIndex() })
}

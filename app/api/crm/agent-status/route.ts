import { NextResponse } from "next/server"
import { requireApiAdmin } from "@/lib/api-auth"
import { getAgentStatus } from "@/lib/crm-data"

export const dynamic = "force-dynamic"

/** Drives the desk agent's expression; refetched as you move around the admin. */
export async function GET(request: Request) {
  const denied = await requireApiAdmin(request)
  if (denied) return denied
  return NextResponse.json(await getAgentStatus())
}

import { NextResponse } from "next/server"
import { requireApiAdmin } from "@/lib/api-auth"
import { getDeskSuggestions } from "@/lib/crm-data"

export const dynamic = "force-dynamic"

/** What the desk offers before anything is typed — shared by the home and ⌘K. */
export async function GET(request: Request) {
  const denied = await requireApiAdmin(request)
  if (denied) return denied
  return NextResponse.json({ groups: await getDeskSuggestions() })
}

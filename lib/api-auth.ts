import { NextResponse } from "next/server"
import { isAdminAuthenticated } from "@/lib/admin-auth"

function hasAgentToken(request?: Request): boolean {
  const configuredToken = process.env.CRM_AGENT_API_TOKEN
  const authorization = request?.headers.get("authorization")
  return Boolean(configuredToken) && authorization === `Bearer ${configuredToken}`
}

export async function requireApiAdmin(request?: Request): Promise<NextResponse | null> {
  if (hasAgentToken(request)) return null
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 })
  }
  return null
}

/**
 * Who is performing this request, derived from the credential actually presented.
 * Never trust an actor name supplied in the request body — audit fields
 * (reviewedBy, createdBy, activity source) must come from here.
 */
export async function getApiActor(request?: Request): Promise<"admin" | "agent"> {
  return hasAgentToken(request) ? "agent" : "admin"
}

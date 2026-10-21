import { requireAdmin } from "@/lib/admin-auth"
import { DeskHome } from "@/components/desk-home"
import { getAgentStatus, getDeskSuggestions } from "@/lib/crm-data"
import { resolveMood, taipeiHour } from "@/lib/agent-mood"

export const dynamic = "force-dynamic"

/**
 * The desk at rest. This route sits outside the (dashboard) group on purpose —
 * no top bar, no nav, no stats. Picking something from the list navigates into
 * the dashboard layout, which is where the compact bar lives.
 */
export default async function AdminHomePage() {
  await requireAdmin()

  const [status, suggestions] = await Promise.all([getAgentStatus(), getDeskSuggestions()])
  const mood = resolveMood(status, "/admin", taipeiHour())
  const tone = mood.tone === "warn" || mood.tone === "danger" ? "attention" : mood.tone === "good" ? "clear" : "idle"

  return <DeskHome greeting={{ pose: mood.pose, message: mood.message, tone }} suggestions={suggestions} />
}

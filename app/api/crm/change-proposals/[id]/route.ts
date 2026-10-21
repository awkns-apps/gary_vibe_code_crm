import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { requireApiAdmin } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { crmChangeProposals, crmClients } from "@/lib/db/schema"
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireApiAdmin(request); if (denied) return denied
  const id = Number((await params).id), body = await request.json()
  const [proposal] = await db.select().from(crmChangeProposals).where(eq(crmChangeProposals.id, id)).limit(1)
  if (!proposal) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Proposal not found" } }, { status: 404 })
  if (proposal.status !== "pending") return NextResponse.json({ error: { code: "ALREADY_REVIEWED", message: "Proposal was already reviewed" } }, { status: 409 })
  if (body.action === "reject") {
    const [updated] = await db.update(crmChangeProposals).set({ status: "rejected", reviewedBy: body.reviewedBy || "admin", reviewedAt: new Date() }).where(eq(crmChangeProposals.id, id)).returning()
    return NextResponse.json({ data: updated })
  }
  if (body.action !== "approve") return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "action must be approve or reject" } }, { status: 400 })
  if (proposal.entityType !== "client") return NextResponse.json({ error: { code: "UNSUPPORTED_ENTITY", message: "Automatic apply currently supports client proposals" } }, { status: 422 })
  let applied
  if (proposal.operation === "create") [applied] = await db.insert(crmClients).values(proposal.proposedData as typeof crmClients.$inferInsert).returning()
  else if (proposal.operation === "update" && proposal.entityId) [applied] = await db.update(crmClients).set({ ...proposal.proposedData, updatedAt: new Date() }).where(eq(crmClients.id, proposal.entityId)).returning()
  else if (proposal.operation === "archive" && proposal.entityId) [applied] = await db.update(crmClients).set({ status: "archived", archivedAt: new Date(), updatedAt: new Date() }).where(eq(crmClients.id, proposal.entityId)).returning()
  if (!applied) return NextResponse.json({ error: { code: "CONFLICT", message: "Target no longer exists" } }, { status: 409 })
  const [updated] = await db.update(crmChangeProposals).set({ status: "applied", reviewedBy: body.reviewedBy || "admin", reviewedAt: new Date(), appliedAt: new Date() }).where(eq(crmChangeProposals.id, id)).returning()
  return NextResponse.json({ data: updated, applied })
}

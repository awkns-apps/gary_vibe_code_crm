import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { getApiActor, requireApiAdmin } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { crmChangeProposals, crmClients } from "@/lib/db/schema"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireApiAdmin(request)
  if (denied) return denied
  const actor = await getApiActor(request)
  const id = Number((await params).id)
  const body = await request.json()
  if (!Number.isSafeInteger(id) || id <= 0 || !["approve", "reject"].includes(body.action)) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "A positive proposal id and approve/reject action are required" } }, { status: 400 })
  }

  // Serialize reviews so an approval cannot apply the same proposal twice.
  // The target mutation and review metadata must commit together.
  return db.transaction(async (tx) => {
    const [proposal] = await tx.select().from(crmChangeProposals)
      .where(eq(crmChangeProposals.id, id)).limit(1).for("update")
    if (!proposal) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Proposal not found" } }, { status: 404 })
    if (proposal.status !== "pending") return NextResponse.json({ error: { code: "ALREADY_REVIEWED", message: "Proposal was already reviewed" } }, { status: 409 })
    if (body.action === "reject") {
      const [updated] = await tx.update(crmChangeProposals).set({ status: "rejected", reviewedBy: actor, reviewedAt: new Date() }).where(eq(crmChangeProposals.id, id)).returning()
      return NextResponse.json({ data: updated })
    }
    if (proposal.entityType !== "client") return NextResponse.json({ error: { code: "UNSUPPORTED_ENTITY", message: "Automatic apply currently supports client proposals" } }, { status: 422 })
    let applied
    if (proposal.operation === "create") [applied] = await tx.insert(crmClients).values(proposal.proposedData as typeof crmClients.$inferInsert).returning()
    else if (proposal.operation === "update" && proposal.entityId) [applied] = await tx.update(crmClients).set({ ...proposal.proposedData, updatedAt: new Date() }).where(eq(crmClients.id, proposal.entityId)).returning()
    else if (proposal.operation === "archive" && proposal.entityId) [applied] = await tx.update(crmClients).set({ status: "archived", archivedAt: new Date(), updatedAt: new Date() }).where(eq(crmClients.id, proposal.entityId)).returning()
    if (!applied) return NextResponse.json({ error: { code: "CONFLICT", message: "Target no longer exists" } }, { status: 409 })
    const [updated] = await tx.update(crmChangeProposals).set({ status: "applied", reviewedBy: actor, reviewedAt: new Date(), appliedAt: new Date() }).where(eq(crmChangeProposals.id, id)).returning()
    return NextResponse.json({ data: updated, applied })
  })
}

import {
  boolean,
  integer,
  jsonb,
  index,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  uniqueIndex,
} from "drizzle-orm/pg-core"

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const crmClientStatus = pgEnum("crm_client_status", [
  "lead",
  "qualified",
  "active",
  "dormant",
  "archived",
])

export const crmDealStage = pgEnum("crm_deal_stage", [
  "discovery",
  "analysis",
  "proposal",
  "negotiation",
  "won",
  "lost",
])

export const crmAnalysisType = pgEnum("crm_analysis_type", [
  "needs",
  "market",
  "pricing",
])

export const crmRunStatus = pgEnum("crm_run_status", [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
])

export const crmAnalysisStatus = pgEnum("crm_analysis_status", [
  "draft",
  "needs_review",
  "approved",
  "superseded",
  "rejected",
])

export const crmProposalStatus = pgEnum("crm_proposal_status", [
  "pending",
  "approved",
  "rejected",
  "applied",
  "conflict",
])

export const crmClients = pgTable("crm_clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  legalName: text("legal_name"),
  clientType: varchar("client_type", { length: 24 }).notNull().default("company"),
  industry: text("industry"),
  website: text("website"),
  source: text("source"),
  status: crmClientStatus("status").notNull().default("lead"),
  owner: text("owner"),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  summary: text("summary"),
  notes: text("notes"),
  lastInteractionAt: timestamp("last_interaction_at", { withTimezone: true }),
  nextAction: text("next_action"),
  nextActionAt: timestamp("next_action_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
}, (table) => [
  index("crm_clients_status_idx").on(table.status),
  index("crm_clients_next_action_at_idx").on(table.nextActionAt),
  index("crm_clients_updated_at_idx").on(table.updatedAt),
])

export const crmContacts = pgTable("crm_contacts", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => crmClients.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  title: text("title"),
  department: text("department"),
  email: text("email"),
  phone: text("phone"),
  linkedinUrl: text("linkedin_url"),
  isPrimary: boolean("is_primary").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("crm_contacts_client_id_idx").on(table.clientId),
  index("crm_contacts_email_idx").on(table.email),
])

export const crmDeals = pgTable("crm_deals", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => crmClients.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  stage: crmDealStage("stage").notNull().default("discovery"),
  value: numeric("value", { precision: 14, scale: 2 }),
  currency: varchar("currency", { length: 3 }).notNull().default("TWD"),
  probability: integer("probability").notNull().default(20),
  expectedCloseAt: timestamp("expected_close_at", { withTimezone: true }),
  scope: text("scope"),
  pricingNotes: text("pricing_notes"),
  lostReason: text("lost_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("crm_deals_client_id_idx").on(table.clientId),
  index("crm_deals_stage_idx").on(table.stage),
  index("crm_deals_expected_close_at_idx").on(table.expectedCloseAt),
])

export const crmActivities = pgTable("crm_activities", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => crmClients.id, { onDelete: "cascade" }),
  dealId: integer("deal_id").references(() => crmDeals.id, { onDelete: "set null" }),
  type: varchar("type", { length: 24 }).notNull().default("note"),
  subject: text("subject").notNull(),
  content: text("content"),
  source: varchar("source", { length: 24 }).notNull().default("human"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  dueAt: timestamp("due_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("crm_activities_client_id_idx").on(table.clientId),
  index("crm_activities_due_at_idx").on(table.dueAt),
  index("crm_activities_occurred_at_idx").on(table.occurredAt),
])

export const crmAnalyses = pgTable("crm_analyses", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => crmClients.id, { onDelete: "cascade" }),
  dealId: integer("deal_id").references(() => crmDeals.id, { onDelete: "set null" }),
  type: crmAnalysisType("type").notNull(),
  title: text("title").notNull(),
  status: crmAnalysisStatus("status").notNull().default("draft"),
  summary: text("summary"),
  findings: jsonb("findings").$type<Array<{ label: string; detail: string }>>().notNull().default([]),
  recommendations: jsonb("recommendations").$type<string[]>().notNull().default([]),
  evidence: jsonb("evidence").$type<Array<{ title: string; url?: string; note?: string }>>().notNull().default([]),
  confidence: integer("confidence"),
  version: integer("version").notNull().default(1),
  supersedesId: integer("supersedes_id"),
  createdBy: varchar("created_by", { length: 64 }).notNull().default("human"),
  reviewedBy: varchar("reviewed_by", { length: 96 }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("crm_analyses_client_id_idx").on(table.clientId),
  index("crm_analyses_deal_id_idx").on(table.dealId),
  index("crm_analyses_type_status_idx").on(table.type, table.status),
  index("crm_analyses_updated_at_idx").on(table.updatedAt),
])

export const crmAgentRuns = pgTable("crm_agent_runs", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => crmClients.id, { onDelete: "set null" }),
  analysisId: integer("analysis_id").references(() => crmAnalyses.id, { onDelete: "set null" }),
  agentName: varchar("agent_name", { length: 96 }).notNull(),
  taskType: varchar("task_type", { length: 48 }).notNull(),
  status: crmRunStatus("status").notNull().default("queued"),
  input: jsonb("input").$type<Record<string, unknown>>().notNull().default({}),
  output: jsonb("output").$type<Record<string, unknown>>(),
  sourceRefs: jsonb("source_refs").$type<Array<{ kind: string; id?: string; url?: string }>>().notNull().default([]),
  model: varchar("model", { length: 96 }),
  promptVersion: varchar("prompt_version", { length: 48 }),
  idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("crm_agent_runs_idempotency_key_idx").on(table.idempotencyKey),
  index("crm_agent_runs_client_id_idx").on(table.clientId),
  index("crm_agent_runs_status_idx").on(table.status),
  index("crm_agent_runs_created_at_idx").on(table.createdAt),
])

export const crmChangeProposals = pgTable("crm_change_proposals", {
  id: serial("id").primaryKey(),
  agentRunId: integer("agent_run_id").notNull().references(() => crmAgentRuns.id, { onDelete: "cascade" }),
  entityType: varchar("entity_type", { length: 48 }).notNull(),
  entityId: integer("entity_id"),
  operation: varchar("operation", { length: 16 }).notNull(),
  proposedData: jsonb("proposed_data").$type<Record<string, unknown>>().notNull(),
  currentSnapshot: jsonb("current_snapshot").$type<Record<string, unknown>>(),
  reason: text("reason").notNull(),
  confidence: integer("confidence"),
  status: crmProposalStatus("status").notNull().default("pending"),
  reviewedBy: varchar("reviewed_by", { length: 96 }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  appliedAt: timestamp("applied_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("crm_change_proposals_agent_run_id_idx").on(table.agentRunId),
  index("crm_change_proposals_status_idx").on(table.status),
  index("crm_change_proposals_entity_idx").on(table.entityType, table.entityId),
])

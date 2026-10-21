# Agent integration and write policy

## Data boundary

- `contact_messages`: raw website submissions; read-only for agents.
- `crm_clients`: curated company/person records.
- `crm_analyses`: versioned research artifacts.
- `crm_agent_runs`: immutable execution/audit metadata.
- `crm_change_proposals`: proposed mutations awaiting review.

## Required metadata

Every run needs a globally unique `idempotencyKey`, `agentName`, `taskType`,
input summary and source references. Research should include model and prompt
version. Confidence is an integer from 0–100, not a substitute for evidence.

## Write policy

- Default to a change proposal for client/contact/deal mutations.
- Never delete a client. Propose `archive`.
- Never overwrite an approved analysis. Create a new version and set
  `supersedesId`.
- Market facts require a URL, retrieval date and a note describing relevance.
- Pricing output must state scope, assumptions, exclusions and currency.
- Reuse the same idempotency key for retries of the same logical operation.
- Do not place secrets, credentials or unnecessary personal data in outputs.

## Approval side effects

Approval is the only transition that mutates the pipeline, and it is applied
server-side in one transaction (`lib/crm-approval.ts`). `reviewedBy` /
`reviewedAt` are derived from the presented credential — a cookie session
records `admin`, a `CRM_AGENT_API_TOKEN` bearer records `agent`. Values sent in
the request body are ignored.

Approving a `needs` analysis:

1. attaches the analysis to a deal, creating one at stage `analysis` if
   `dealId` was empty, or advancing an existing `discovery` deal
2. promotes the client `lead` → `qualified`
3. queues a `pricing_analysis` run (`idempotencyKey`
   `pricing_analysis-<analysisId>`, so re-approval never double-queues)
4. writes a timeline activity

Approving a `pricing` analysis moves the deal to `proposal`, lifts probability
to at least 60, copies the summary into `pricingNotes`, and parses the
`recommended_price` finding into `crm_deals.value`. Deals already at `won` or
`lost` keep their stage. Approving a `market` analysis has no pipeline effect.

Queued runs are consumed by `scripts/crm-analyst/fetch-queued-runs.mjs` and
closed out by `save-pricing-analysis.mjs`.

## Status dictionaries

- Client: `lead`, `qualified`, `active`, `dormant`, `archived`
- Deal: `discovery`, `analysis`, `proposal`, `negotiation`, `won`, `lost`
- Analysis: `draft`, `needs_review`, `approved`, `superseded`, `rejected`
- Run: `queued`, `running`, `completed`, `failed`, `cancelled`
- Proposal: `pending`, `approved`, `rejected`, `applied`, `conflict`

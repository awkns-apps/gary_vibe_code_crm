# Agent integration and write policy

## Data boundary

- `contact_messages`: raw website submissions; read-only for agents.
- `crm_clients`: curated company/person records.
- `crm_analyses`: versioned research artifacts.
- `crm_agent_runs`: mutable execution records with input/output and status metadata.
- `crm_change_proposals`: proposed mutations awaiting review.

## Required metadata

Every run needs a globally unique `idempotencyKey`, `agentName`, `taskType`,
input summary and source references. Research should include model and prompt
version. Confidence is an integer from 0–100, not a substitute for evidence.

## Write policy

- HTTP workers should default to a change proposal for client mutations. Automatic
  application supports clients only; contact/deal proposals return 422 on approval.
- The trusted local inquiry saver is a separate workflow: it directly creates a lead
  and a pending analysis. It does not create a proposal.
- Never delete a client. Propose `archive`.
- Never overwrite an approved analysis. Use `PATCH /analyses/{id}` with `{ "createVersion": true }`; the server
  creates a draft and assigns `supersedesId` and the version.
- Market facts require a URL, retrieval date and a note describing relevance.
- Pricing output must state scope, assumptions, exclusions and currency.
- Reuse the same idempotency key for retries of the same logical operation.
- Do not place secrets, credentials or unnecessary personal data in outputs.

## Approval side effects

Analysis approval triggers automated pipeline effects, applied
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

## Implementation limits

- Worker policy is guidance, not role-based enforcement. The API token can also
  perform direct writes and approve reviews. There are no per-agent scopes.
- Local scripts require direct database privileges and do not use the API token.
- There is no HTTP endpoint for raw website inquiries; use the local fetch script.
- Runs are editable; their creation key is idempotent, but later analysis/proposal
  writes are not deduplicated automatically. Avoid blind retries after timeouts.
- Client proposals support create/update/archive. Other entities cannot auto-apply.
  Review metadata is server-derived, and the mutation/review are one transaction.
  `currentSnapshot` is recorded but not compared to current data before application.
- Client DELETE archives. Contact, activity and deal DELETE permanently remove rows.
- Pricing takes the first numeric amount from `recommended_price`; use `TWD 180,000`
  rather than `180k`, ranges or a sentence containing another number. Currency is
  taken from the deal, not inferred or converted from the finding.
- Create analyses as `draft` or `needs_review`, then use PATCH to approve. Creating
  an analysis with status `approved` does not invoke the approval-effects handler.
- Input validation and errors are not uniform across all routes. Clients must send
  valid IDs, enums, JSON arrays and dates; some invalid payloads cause database errors
  rather than a structured 400. This is not a complete adversarial-input audit.
- No bundled scheduler or model execution exists. See [Hermes setup](hermes.md).

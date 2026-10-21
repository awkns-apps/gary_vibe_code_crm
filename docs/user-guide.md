# Using Gary Vibe Code CRM

## First login

Complete the root README setup, start the server, and visit `/admin/login`.
Use `ADMIN_PASSWORD`. The signed session lasts up to seven days. **登出** clears
it. There is one shared admin identity; there are no invitations, roles or password
reset emails. Change configuration and restart to rotate credentials; changing
`ADMIN_SESSION_SECRET` invalidates existing sessions.

## Pages and available actions

| Page | Route | What to do |
| --- | --- | --- |
| Search desk | `/admin` | Search clients, deals and analyses, or choose a suggested destination. `⌘K` opens the command palette on admin pages. |
| 今日工作 | `/admin/today` | Review counts, decisions and pipeline status. |
| 網站詢問 | `/admin/inquiries` | Read original website submissions and follow links to processed CRM records. |
| 客戶 | `/admin/clients` | Search and create clients. Include a primary contact in the create form if available. |
| Client detail | `/admin/clients/{id}` | Read contacts, deals, analyses and activity history; add an activity or create an analysis. |
| 商機管線 | `/admin/deals` | Create a deal, inspect its detail page, and move its stage using the stage selector. |
| 分析與報價 | `/admin/analyses` | Create/filter analyses and open the detail page for review/version actions. |
| Agent 審核 | `/admin/agent-runs` | Inspect run status and failures; approve/apply or reject pending client proposals. |

Contact edits/deletion, client edits/archive, activity completion/reopening/deletion,
and deal deletion are available through the API; not every API operation has a UI
button. Client deletion means archive. Contact, activity and deal DELETE endpoints
permanently remove those records. Use the API reference for exact operations.

## Website inquiry to proposal

1. A visitor submits name, email, subject and a message of at least 10 characters.
   The form saves `contact_messages`; it does not send email or trigger AI work.
2. An external Hermes worker can run the local inquiry workflow, producing a **lead**
   and a needs analysis in `needs_review`. A manually created client/analysis is
   another way to begin.
3. Review the needs analysis, evidence, assumptions and confidence. Approve to create
   or link a deal at `analysis`, qualify a lead and queue a pricing run. Reject to
   keep it from advancing the pipeline.
4. Hermes processes the pricing run and saves a pricing analysis in `needs_review`.
   Nothing runs automatically until the worker is configured.
5. Review and approve pricing. The linked deal moves to `proposal` unless already
   `won` or `lost`; its value comes from the `recommended_price` finding.
6. Manage negotiations and the final deal outcome manually in the pipeline.

For pricing findings, use a plain amount such as `TWD 180,000`. The parser uses the
first numeric amount; it does not convert currencies, understand `180k`, or multiply
per-month prices. The deal's existing currency is retained (default TWD).

## Analysis lifecycle

Create a `needs`, `market` or `pricing` draft, then choose **送交審核**. Reviewers can
approve or reject. Market approval does not create or price a deal. Approval is the
trigger for automated pipeline effects, but authorized users can also manually edit
deals. The API does not enforce an exclusive human-review role for Bearer tokens.

Approved analyses reject ordinary edits with 409. **建立新版本** creates a draft,
links `supersedesId`, and marks the original `superseded`. The existing detail page
stays open; find the new draft in the analysis list. Audit identity for analysis and
proposal review comes from the credential (`admin` session or `agent` token).

## Proposals and runs

A pending client proposal can create, update or archive a client. Review it with the
worker's supporting evidence before applying. The current review UI shows the reason
and operation, not a full field-by-field diff; inspect the API's `proposedData` when
needed. Non-client proposals can be recorded/rejected, but cannot be automatically
applied (422). `currentSnapshot` is stored for context; it is not an optimistic-lock
check. Repeated/concurrent reviews of the same proposal are guarded.

Runs record execution state, input/output, source references and errors. They are
mutable records, not an append-only audit log. A queued run requires an external
worker. The pricing script records an explicit analysis failure as `failed`; review
its reason and fix missing inputs before arranging a deliberate retry.

## Operating boundaries

There is no automatic email delivery, built-in LLM invocation, billing, multi-user
permissions or scheduled-worker installation. These are a CRM and worker integration
foundation. See [Hermes setup](crm/hermes.md), [API policy](crm/agent-integration.md)
and [verification coverage](crm/verification.md) for tested behavior and limits.

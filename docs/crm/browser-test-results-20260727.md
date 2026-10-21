# CRM Browser E2E Results — 2026-07-27

> Historical results inherited from the previous project. These are not a fresh
> verification of this repository. See [current coverage](verification.md).

Plan: `docs/crm/browser-test-plan.md`

Run identifier: `E2E_BROWSER_20260727_220000`

Initial run: **24 PASS / 6 FAIL**

Fix verification: **30 PASS / 0 FAIL**

## Scenario results

| # | Scenario | Result | Evidence |
|---|---|---|---|
| 01 | Unauthenticated admin redirect | PASS | Admin routes returned `307 /admin/login`; clients API returned `401 UNAUTHORIZED`. |
| 02 | Login validation | PASS | Logout now submits correctly; empty, incorrect, and valid-password states were rechecked in Browser. |
| 03 | Desktop navigation | PASS | All six module routes loaded with one matching page heading. |
| 04 | Mobile navigation | PASS | Mobile navigation remains reachable; each tested route exposes exactly one `aria-current="page"`. |
| 05 | Dashboard counts match data | PASS | Displayed 6 inquiries, 3 clients, 4 open deals, TWD 100,000, and 1 review; values matched fixtures. |
| 06 | Decision rail ordering and links | PASS | Overdue task, future task, and review analysis linked to the correct client/analysis IDs. |
| 07 | Contact inbox desktop table | PASS | Date, name, email, subject, and message rendered newest-first; mail links were correct. |
| 08 | Contact inbox mobile cards | PASS | Six cards rendered exactly once; visible mail targets measured 40×40px. |
| 09 | Contact and CRM remain independent | PASS | Reading inbox sent no client-create request and did not change client count. |
| 10 | Create client with primary contact | PASS | Browser created client ID 6 and its primary contact; detail page loaded. |
| 11 | Client form validation | PASS | Blank form remained on create page; missing-name API returned `400`; no invalid row was created. |
| 12 | Client list search | PASS | Direct `?q=DORMANT` returned only the dormant fixture. |
| 13 | Client detail completeness | PASS | Primary contact, overdue task, discovery deal, and needs analysis belonged to client ID 3. |
| 14 | Add an activity | PASS | Browser meeting appeared after refresh and was stored against client ID 3. |
| 15 | Complete and reopen a task | PASS | Activity PATCH returned `200`; `completed_at` changed to a timestamp and back to `null`. |
| 16 | Contact resource lifecycle | PASS | Contact create/update/delete returned `201/200/200`; targeted contact count returned to zero. |
| 17 | Create a deal | PASS | Browser-created deal stored TWD 77,777 and appeared in Discovery. |
| 18 | Move a deal through stages | PASS | Analysis, proposal, negotiation, won, and lost transitions all persisted. |
| 19 | Mobile pipeline density | PASS | Select targets remain 44px and the Deals document now measures exactly 390px at a 390px viewport. |
| 20 | Delete a test deal safely | PASS | Delete returned `200`, repeat returned `404`, and the client remained. |
| 21 | Create each analysis type | PASS | Browser created needs, market, and pricing draft analyses. |
| 22 | Analysis detail rendering | PASS | Findings, recommendations, evidence, and confidence value 92 all rendered. |
| 23 | Submit analysis for review | PASS | Draft changed to `needs_review`; approve/reject controls appeared. |
| 24 | Approve an analysis | PASS | Status, reviewer, and reviewed timestamp persisted without serialization errors. |
| 25 | Reject an analysis | PASS | Status became rejected and reviewer metadata persisted. |
| 26 | Version an approved analysis | PASS | Direct edit returned `409 IMMUTABLE_APPROVED`; v1 became superseded and v2 referenced it. |
| 27 | Agent run status rendering | PASS | Completed/failed/running states render and the failed-run error reason is visible. |
| 28 | Approve/apply client-create proposal | PASS | Exactly one client was created; proposal received reviewer and applied timestamps. |
| 29 | Reject proposal | PASS | Target client remained unchanged; repeated review returned `409`. |
| 30 | Responsive/accessibility/console/cleanup | PASS | Responsive widths, unique current-page semantics, skip-link focusability, lint, typecheck, production build, and cleanup passed. |

## Responsive measurements

| Route | 390 viewport | 430 viewport | Result |
|---|---:|---:|---|
| `/admin` | 390px | 430px | PASS |
| `/admin/inquiries` | 390px | 430px | PASS |
| `/admin/clients` | 390px | 430px | PASS |
| `/admin/clients/new` | 390px | 430px | PASS |
| `/admin/deals` | 390px | 430px | PASS |
| `/admin/analyses` | 390px | 430px | PASS |
| `/admin/analyses/14` | 390px | 430px | PASS |
| `/admin/agent-runs` | 390px | 430px | PASS |
| `/admin/clients/8` (long unbroken fixture) | 390px | 430px | PASS |

Mobile inputs, selects, and buttons measured 44px where present.

## Release blockers

All six initial blockers were resolved and rechecked. The admin shell now also
includes a native, explicitly focusable skip link with a visible focus outline.
The in-app Browser keyboard driver did not advance focus from `body`, so the
accessibility verification used DOM semantics (`href="#admin-main"`,
`tabIndex=0`) plus the visible focus CSS contract.

## Quality checks

- Browser console on a fresh tab: PASS, no errors or warnings.
- ESLint: PASS.
- TypeScript: PASS.
- Production build: PASS.
- `git diff --check`: PASS.
- Unexpected API 5xx during this run: none.
- Production responsive rerun: all nine admin routes matched the 390px viewport.

## Database cleanup

Baseline:

```text
contact_messages: 3
crm_clients: 0
crm_contacts: 0
crm_deals: 0
crm_activities: 0
crm_analyses: 0
crm_agent_runs: 0
crm_change_proposals: 0
```

Deleted E2E roots:

```text
clients: 5
agent runs: 3
contact messages: 3
```

Final counts exactly matched baseline. No E2E rows remain.

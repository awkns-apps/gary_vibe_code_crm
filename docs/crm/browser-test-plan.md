# CRM Admin Browser E2E Test Plan

## 1. Purpose

This plan verifies that an admin can operate the contact inbox, CRM, deals,
analyses, and agent review queue through the browser. It contains 30 user
scenarios and validates the UI, HTTP API, and PostgreSQL state.

Periodic AI collection, scheduling, and unattended automatic review are out of
scope. Agent scenarios use database fixtures representing completed external
agent work.

## 2. Test environments

Run the scenarios at:

- Desktop: `1440 × 900`
- Mobile small: `390 × 844`
- Mobile large: `430 × 932`
- Base URL: `http://localhost:3001`
- Admin entry: `/admin/login`
- API base: `/api/crm/v1`

Required environment variables:

```text
DATABASE_URL
ADMIN_PASSWORD
ADMIN_SESSION_SECRET
CRM_AGENT_API_TOKEN
```

Never print these values in test output, screenshots, or logs.

## 3. Test data convention

Every test-created record must include the run identifier:

```text
E2E_BROWSER_<YYYYMMDD_HHMMSS>
```

Example:

```text
E2E_BROWSER_20260727_210000_ACME
```

Use `.invalid` email domains:

```text
qa-contact@e2e.invalid
```

Never modify or delete existing non-E2E records.

## 4. Database fixtures

Create fixtures in a transaction-aware setup script before Browser testing.
Use explicit IDs returned by `INSERT ... RETURNING`; never assume serial IDs.

### Fixture A — raw contact messages

Insert three `contact_messages` records:

1. A detailed company inquiry with name, corporate-looking email, subject, and
   a long automation requirement.
2. A short low-information inquiry.
3. A multiline message long enough to verify wrapping on mobile.

### Fixture B — CRM clients

Insert:

1. Lead client with a primary contact, tags, next action, and future due date.
2. Active client with two contacts and a recent completed activity.
3. Dormant client with no contacts, deals, or analyses.

### Fixture C — deals

For Fixture B clients, insert one deal in each stage:

- `discovery`
- `analysis`
- `proposal`
- `negotiation`
- `won`
- `lost`

Include values, probabilities, currencies, and expected close dates.

### Fixture D — activities

Insert:

- One overdue incomplete task
- One future task
- One completed task
- One meeting note
- One activity with `source = agent`

### Fixture E — analyses

Insert:

- Needs analysis in `draft`
- Market analysis in `needs_review`
- Pricing analysis in `approved`
- Superseded v1 and draft v2 pair
- Evidence entries with and without URLs
- Confidence values of `null`, `55`, and `92`

### Fixture F — agent review

Insert:

- Completed agent run
- Failed agent run with an error
- Running agent run
- Pending client-create proposal
- Pending client-update proposal
- Rejected proposal
- Applied proposal

All fixture records must be traceable through the run identifier.

## 5. Evidence collected per scenario

Record:

- Scenario number and result
- Starting URL and final URL
- Desktop or mobile viewport
- Screenshot on failure
- Browser console errors and warnings
- Failed network request method, URL, status, and response body
- Relevant row IDs
- Database assertion result

Do not continue after a destructive or cross-record data-integrity failure.

---

# 6. User scenarios

## Authentication and navigation

### 01 — Unauthenticated admin redirect

**Goal:** A signed-out visitor cannot access CRM data.

**Setup:** Clear the admin session.

**Browser steps:**

1. Navigate to `/admin`.
2. Verify redirect to `/admin/login`.
3. Attempt `/admin/clients` and `/admin/analyses`.

**UI checks:**

- Password field and “Sign in” button are visible.
- No CRM customer names or metrics appear.

**API checks:**

- `GET /api/crm/v1/clients` without authentication returns `401`.
- Response code is `UNAUTHORIZED`.

**Database checks:** None; no rows may change.

### 02 — Login validation

**Goal:** Invalid credentials fail clearly and valid credentials open Admin.

**Setup:** Admin credentials are configured.

**Browser steps:**

1. Submit an empty password.
2. Submit an incorrect password.
3. Submit the configured test password.

**UI checks:**

- Empty and incorrect states show actionable errors.
- Valid login navigates to `/admin`.
- Focus remains usable after an error.

**API checks:** Login action returns no server error.

**Database checks:** None.

### 03 — Desktop navigation

**Goal:** Every primary module is reachable.

**Browser steps:** Open Today, Inquiries, Clients, Deals, Analyses, and Agent
Review from the sidebar.

**UI checks:**

- Current item has `aria-current="page"`.
- Page heading matches the selected module.
- Sidebar remains visible at `1440 × 900`.

**API checks:** Every page request returns `200`.

**Database checks:** None.

### 04 — Mobile navigation

**Goal:** Modules remain reachable with one-handed horizontal navigation.

**Browser steps:** At `390 × 844`, horizontally scroll the module strip and
open every module.

**UI checks:**

- Labels stay horizontal.
- Right-edge gradient indicates more items.
- No document-level horizontal overflow.
- Logout and navigation remain visible.

**API checks:** Every page request returns `200`.

**Database checks:** None.

## Today workspace

### 05 — Dashboard counts match data

**Goal:** Summary numbers are trustworthy.

**Setup:** Fixtures A–F.

**Browser steps:** Open `/admin`.

**UI checks:**

- Inquiry, client, open-deal, and review counts are visible.
- Pipeline amount is formatted as TWD.

**API checks:** Dashboard page returns `200`.

**Database checks:** Compare displayed values to SQL counts and the sum of deal
values excluding `won` and `lost`.

### 06 — Decision rail ordering and links

**Goal:** Overdue tasks and reviewable analyses lead to the correct record.

**Setup:** Overdue task, future task, and review analysis fixtures.

**Browser steps:**

1. Open `/admin`.
2. Open each visible Decision rail item.

**UI checks:**

- Type badge, title, and date/version are visible.
- Each item opens the correct client or analysis.

**API checks:** Destination pages return `200`.

**Database checks:** Displayed record ID matches the linked fixture.

## Contact inbox

### 07 — Contact inbox desktop table

**Goal:** Admin can scan raw messages efficiently.

**Setup:** Fixture A.

**Browser steps:** Open `/admin/inquiries` at desktop width.

**UI checks:**

- Date, name, email, subject, and message columns are present.
- Long messages wrap or clamp without breaking the layout.
- Email link uses `mailto:`.

**API checks:** Page returns `200`.

**Database checks:** Row count and ordering match `contact_messages` by newest
first.

### 08 — Contact inbox mobile cards

**Goal:** Full messages are readable without horizontal scrolling.

**Setup:** Fixture A.

**Browser steps:** Open the inbox at `390 × 844` and scroll all messages.

**UI checks:**

- Each message displays name, date, subject, content, and email.
- Email button is at least `40 × 40`.
- `document.scrollWidth === viewport width`.

**API checks:** Page returns `200`.

**Database checks:** Every fixture message appears exactly once.

### 09 — Contact and CRM remain independent

**Goal:** Viewing raw contacts does not create CRM data.

**Browser steps:** Open and navigate through all inbox messages.

**UI checks:** Copy explains that CRM is not changed automatically.

**API checks:** No client-create request is sent.

**Database checks:** `crm_clients` count is unchanged.

## CRM clients and contacts

### 10 — Create a client with primary contact

**Goal:** Admin can create a usable CRM relationship in one form.

**Browser steps:**

1. Open `/admin/clients/new`.
2. Enter company data, tags, summary, contact, and next action.
3. Save.

**UI checks:**

- Required fields are clear.
- Save button shows a pending state.
- Browser navigates to the new client detail.

**API checks:** `POST /api/crm/v1/clients` returns `201`.

**Database checks:** One client and one primary contact are created with correct
foreign key, tags, and next-action values.

### 11 — Client form validation

**Goal:** Incomplete or invalid data cannot create bad records.

**Browser steps:** Submit without a name and enter an invalid email/URL.

**UI checks:** Native or application validation identifies the exact fields.

**API checks:** Direct missing-name payload returns `400`.

**Database checks:** No client row is created.

### 12 — Client list search

**Goal:** Admin can find clients by name, industry, or tag.

**Setup:** Fixture B.

**Browser steps:** Search with a name fragment, industry, tag, and no-match
query; submit with Enter.

**UI checks:** Correct result subset and meaningful no-result state.

**API checks:** Client list page remains `200`.

**Database checks:** Search never modifies data.

### 13 — Client detail completeness

**Goal:** The detail page provides enough context to act.

**Setup:** Lead client fixture.

**Browser steps:** Open the client from the list.

**UI checks:**

- Status, industry, source, next action, primary contact, activity timeline,
  deals, and analyses appear.
- “Create analysis” navigates correctly.

**API checks:** Client page and context endpoint return `200`.

**Database checks:** Displayed contacts, deals, activities, and analyses belong
to the selected client only.

### 14 — Add an activity

**Goal:** Admin can record an interaction.

**Browser steps:** Add a meeting activity from client detail.

**UI checks:** Pending state, input clears, and timeline updates after save.

**API checks:** `POST /api/crm/v1/activities` returns `201`.

**Database checks:** Activity has correct `client_id`, type, source `human`, and
timestamp; client `last_interaction_at` updates.

### 15 — Complete and reopen a task

**Goal:** Task completion state remains accurate.

**Setup:** Incomplete task fixture.

**Browser/API steps:** Complete and reopen through the available UI or the
resource API if the UI does not expose the control.

**UI checks:** Completed task no longer appears in active Decision rail.

**API checks:** `PATCH /api/crm/v1/activities/{id}` returns `200`.

**Database checks:** `completed_at` changes from `null` to a timestamp and back
to `null`.

### 16 — Contact resource lifecycle

**Goal:** Contact create, update, and delete APIs preserve client integrity.

**Setup:** Test client.

**Browser/API steps:** Add, edit, and remove a secondary contact.

**UI checks:** Client detail shows the updated contact set after refresh.

**API checks:**

- `POST /clients/{id}/contacts` → `201`
- `PATCH /contacts/{id}` → `200`
- `DELETE /contacts/{id}` → `200`

**Database checks:** Correct client remains; only the targeted contact is
deleted.

## Deals

### 17 — Create a deal

**Goal:** Admin can add an opportunity from the pipeline.

**Setup:** CRM client fixture.

**Browser steps:** Open Deals, expand “New deal,” select client, enter title and
value, and save.

**UI checks:** Deal appears in Discovery with formatted amount.

**API checks:** `POST /api/crm/v1/deals` returns `201`.

**Database checks:** Deal references the selected client and stores value,
currency, probability, and stage correctly.

### 18 — Move a deal through stages

**Goal:** Pipeline changes persist.

**Browser steps:** Move the E2E deal through analysis, proposal, negotiation,
won, and lost.

**UI checks:** Card moves to the selected stage after each change.

**API checks:** Each `PATCH /deals/{id}` returns `200`.

**Database checks:** Only the targeted deal’s stage changes.

### 19 — Mobile pipeline density

**Goal:** All six stages can be scanned without empty desktop-sized columns.

**Browser steps:** Open Deals at `390 × 844`.

**UI checks:**

- Empty stage height is approximately 62px.
- No horizontal document overflow.
- Deal stage control has at least 44px touch height.

**API checks:** Page returns `200`.

**Database checks:** Stage counts match SQL.

### 20 — Delete a test deal safely

**Goal:** Removing a deal does not remove its client.

**API steps:** Delete an E2E deal through `DELETE /deals/{id}`.

**UI checks:** Deal disappears after refresh.

**API checks:** First delete returns `200`; repeated delete returns `404`.

**Database checks:** Deal is absent; client, contacts, and unrelated deals
remain.

## Analyses

### 21 — Create each analysis type

**Goal:** Needs, market, and pricing analyses can all be created.

**Browser steps:** Create one draft of each type.

**UI checks:** Correct type labels and v1 appear in Analysis Center.

**API checks:** Three `POST /api/crm/v1/analyses` calls return `201`.

**Database checks:** Types are `needs`, `market`, and `pricing`; status is
`draft`.

### 22 — Analysis detail rendering

**Goal:** Structured findings, recommendations, evidence, and confidence are
understandable.

**Setup:** Fixture E.

**Browser steps:** Open each fixture analysis.

**UI checks:**

- Findings and recommendations preserve order.
- URL evidence is clickable; note-only evidence is plain text.
- Empty confidence reads “not evaluated,” not `0`.

**API checks:** `GET /analyses/{id}` returns `200`.

**Database checks:** Rendered JSON content matches stored arrays.

### 23 — Submit analysis for review

**Goal:** Draft moves to review without stale UI.

**Browser steps:** Open a draft and select “Submit for review.”

**UI checks:** Status immediately becomes `needs_review`; Approve and Reject
controls appear after refresh.

**API checks:** `PATCH /analyses/{id}` returns `200`.

**Database checks:** Status and `updated_at` change.

### 24 — Approve an analysis

**Goal:** Admin can approve a reviewed result.

**Browser steps:** Approve a needs-review analysis.

**UI checks:** Approved badge and “Create new version” action appear.

**API checks:** Patch returns `200`; no timestamp serialization error.

**Database checks:** Status, `reviewed_by`, and `reviewed_at` are stored.

### 25 — Reject an analysis

**Goal:** Admin can reject a reviewed result.

**Browser steps:** Reject a second needs-review fixture.

**UI checks:** Rejected status appears and review actions disappear.

**API checks:** Patch returns `200`.

**Database checks:** Status and reviewer metadata are stored.

### 26 — Version an approved analysis

**Goal:** Approved content is immutable and revisions are traceable.

**Browser steps:**

1. Attempt a direct edit of an approved analysis.
2. Use “Create new version.”

**UI checks:** Direct overwrite is refused; Analysis Center displays
superseded v1 and draft v2.

**API checks:** Direct edit returns `409 IMMUTABLE_APPROVED`; version request
returns `201`.

**Database checks:** v2 has `version = 2` and `supersedes_id = v1`; v1 becomes
`superseded`.

## Agent review

### 27 — Agent run status rendering

**Goal:** Admin can distinguish completed, running, and failed runs.

**Setup:** Fixture F.

**Browser steps:** Open Agent Review.

**UI checks:** Status badges use distinct tones and failed-run error context is
available.

**API checks:** `GET /agent-runs` returns `200`.

**Database checks:** UI count and status values match fixture rows.

### 28 — Approve and apply a client-create proposal

**Goal:** An admin decision creates exactly one CRM client.

**Setup:** Pending client-create proposal.

**Browser steps:** Select “Approve and apply.”

**UI checks:** Pending control disables during request; status becomes applied.

**API checks:** `PATCH /change-proposals/{id}` returns `200`.

**Database checks:** One client is created; proposal has reviewer timestamps and
`applied_at`.

### 29 — Reject a proposal

**Goal:** Rejection records the decision without mutating CRM.

**Setup:** Pending client-update proposal.

**Browser steps:** Select Reject.

**UI checks:** Proposal becomes rejected and action buttons disappear.

**API checks:** Patch returns `200`; repeated action returns `409`.

**Database checks:** Target client snapshot is unchanged; reviewer metadata is
stored.

## System quality and cleanup

### 30 — Full responsive, accessibility, console, and cleanup audit

**Goal:** The test run ends with a clean, usable system.

**Browser steps:**

1. Revisit every admin route at 1440, 390, and 430 widths.
2. Tab through primary controls.
3. Check visible focus and 44px mobile touch targets.
4. Collect browser console and failed network requests.
5. Sign out and verify protected routes redirect again.

**UI checks:**

- No clipping, overlap, document horizontal overflow, missing labels, duplicate
  accessible names, or invisible focus.
- No browser console errors or warnings.

**API checks:**

- No unexpected `4xx` or `5xx`.
- Run lint, typecheck, production build, and `git diff --check`.

**Database cleanup:**

1. Delete E2E clients by exact run identifier; cascades remove contacts, deals,
   activities, and analyses.
2. Delete E2E agent runs; cascades remove proposals.
3. Delete E2E contact messages.
4. Query every CRM table and `contact_messages` for the run identifier.
5. Assert zero E2E rows remain.

---

## 7. Execution order

Run scenarios in this sequence:

```text
01–04 Authentication/navigation
05–09 Dashboard/contact inbox
10–16 Clients/contacts/activities
17–20 Deals
21–26 Analyses
27–29 Agent review
30 Quality audit and cleanup
```

Scenarios that mutate data must run serially. Read-only responsive checks may
run in parallel only after fixture creation has completed.

## 8. Pass criteria

The suite passes only when:

- All 30 scenarios pass.
- UI assertions pass at all three viewports.
- Every expected API method and status matches.
- Database assertions show correct ownership and no cross-record mutation.
- Browser console contains no error or warning.
- No unexpected failed network request exists.
- ESLint, TypeScript, production build, and `git diff --check` pass.
- Cleanup reports zero E2E records in every affected table.

Any stale UI after a successful API mutation, cross-client data exposure,
duplicate mutation, failed cleanup, or unauthorized data access is a release
blocker.

## 9. Coverage matrix

### UI routes

| UI route | Primary checks | Scenarios |
|---|---|---|
| `/admin/login` | Validation, authentication, focus, redirect | 01–02 |
| `/admin` | Counts, decision ordering, quick links, responsive layout | 05–06, 30 |
| `/admin/inquiries` | Desktop table, mobile cards, mail links, data boundary | 07–09 |
| `/admin/clients` | Search, results, empty state, responsive list | 12, 30 |
| `/admin/clients/new` | Validation, touch targets, create workflow | 10–11 |
| `/admin/clients/{id}` | Contacts, timeline, deals, analyses, next action | 13–16 |
| `/admin/deals` | Create form, stage movement, mobile density | 17–20 |
| `/admin/analyses` | Types, versions, statuses, confidence | 21–26 |
| `/admin/analyses/{id}` | Findings, evidence, review, versioning | 22–26 |
| `/admin/agent-runs` | Run states, pending decisions, approve/reject | 27–29 |

### API resources

| API resource | Methods checked | Scenarios |
|---|---|---|
| `/clients` | GET, POST | 01, 10–12 |
| `/clients/{id}` | GET, PATCH, DELETE/Archive contract | 13, 30 |
| `/clients/{id}/contacts` | GET, POST | 10, 16 |
| `/contacts/{id}` | PATCH, DELETE | 16 |
| `/activities` | POST | 14 |
| `/activities/{id}` | PATCH, DELETE contract | 15, 30 |
| `/deals` | GET, POST | 17 |
| `/deals/{id}` | PATCH, DELETE | 18, 20 |
| `/analyses` | GET, POST | 21 |
| `/analyses/{id}` | GET, PATCH, immutable/version behavior | 22–26 |
| `/agent-runs` | GET, POST contract | 27, 30 |
| `/agent-runs/{id}` | PATCH contract | 27, 30 |
| `/change-proposals` | GET, POST contract | 27–29 |
| `/change-proposals/{id}` | PATCH approve/reject/apply | 28–29 |
| `/context/clients/{id}` | GET ownership and normalized context | 13 |

All API paths above use the `/api/crm/v1` base.

### Database tables

| Table | Fixture data | Assertions | Cleanup |
|---|---|---|---|
| `contact_messages` | Three raw inquiries | Count, ordering, exact-once rendering, CRM independence | Delete by E2E names/emails |
| `crm_clients` | Lead, active, dormant clients | Status, tags, next action, isolation | Delete by exact E2E run prefix |
| `crm_contacts` | Primary and secondary contacts | FK ownership, primary flag, lifecycle | Client cascade |
| `crm_deals` | Six deal stages | Stage, value, probability, client ownership | Client cascade |
| `crm_activities` | Overdue, future, completed, human, agent | Completion, ordering, source, client timestamp | Client cascade |
| `crm_analyses` | Three types and version pairs | JSON content, review metadata, immutability, supersedes chain | Client cascade |
| `crm_agent_runs` | Completed, failed, running | Status, model, error, idempotency metadata | Delete by E2E agent/run key |
| `crm_change_proposals` | Pending, rejected, applied | Review transition, CRM mutation, repeated-action protection | Agent-run cascade |

### Fixture integrity assertions

Before scenario 01:

1. Confirm every fixture contains the same run identifier.
2. Confirm all client-owned rows point to an E2E client.
3. Confirm every proposal points to an E2E agent run.
4. Confirm fixture counts match the fixture specification.
5. Capture baseline counts for all eight tables.

After scenario 30:

1. Query all eight tables for the run identifier.
2. Assert every result count is zero.
3. Compare non-E2E counts to the captured baseline.
4. Fail the suite if any pre-existing row changed or disappeared.

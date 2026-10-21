# Verification coverage — 2026-10-22

This records checks on the standalone CRM, not the inherited July browser report.
Passing checks establish the workflows below; they are not a claim that every edge
case, browser, deployment or adversarial payload has been tested.

## Automated checks

Run `pnpm build`, `pnpm lint`, `pnpm typecheck`, then `pnpm test:smoke`.
The smoke suite creates a unique local PostgreSQL database, overrides all app test
credentials, starts the production build on loopback port 3108, and removes the
server/database at the end. It does not write to the configured shared database.

Verified:

- Fresh schema creation, all eight required CRM/inbox tables, repeat migrations.
- Public/admin page responses, unauthenticated access, expired/tampered sessions.
- Client creation with a primary contact, editing, search and missing-name validation.
- Contact creation, update, deletion and repeat-delete 404.
- Activity creation, completion, reopening and deletion.
- Deal creation, all pipeline stages and deletion.
- Needs/pricing approval effects: qualified client, linked deal, queued pricing,
  proposal stage and expected deal amount.
- Market review/rejection, approved-analysis edit guard and new draft version.
- Run creation/replay, status updates, context lookup and Bearer authentication.
- Client proposal create/update/archive/reject; repeat-review conflict, unsupported
  entity response and missing-target response. Reviewer identity cannot be supplied
  by the request body. Concurrent approvals apply once.
- Full local Hermes script round trip: inquiry fetch, needs save, duplicate skip,
  needs approval, pricing queue fetch, pricing save, duplicate skip and pricing
  approval. Intentional worker failure is recorded and visible as a failed run.
- OpenAPI paths/methods checked against source: 18 paths and 31 operations.

The proposal audit found and fixed client-controlled reviewer identity. Proposal
application and review now use a transaction and row lock.

## Browser checks

Against a disposable database using the production build:

- Required-field errors on the public contact form.
- Successful contact submission and exact content visible in the admin inbox.
- Admin login, search, client navigation, activity save and logout.
- Inbox distinguishes the unprocessed browser inquiry from the processed Hermes
  fixture and links the processed fixture to its client and approved needs analysis.

## Existing database

The copied environment was checked using read-only schema queries and authenticated
GET requests for the dashboard, client/deal/analysis/inquiry/run pages and search.
No test writes or migrations were applied to that existing database.

## Remaining boundaries

- Live Hermes scheduling, model/provider authentication, model-output quality and
  deployment-host permissions have not been tested. No job is installed by the app.
- HTTP workers require a configured token. The copied environment did not contain
  `CRM_AGENT_API_TOKEN`; local database scripts do not need one.
- There is no complete mobile, cross-browser, load or security test suite.
- API input validation is uneven. Some invalid IDs, enums/dates or malformed bodies
  may return server/database errors rather than a clean validation response.
- Proposal snapshots are not enforced conflict checks. Only client proposals apply
  automatically; there is no per-agent privilege separation.
- Concurrent analysis approval/versioning and every retry/failure path are not
  covered. Do not infer universal exactly-once behavior from run creation keys.
- No automatic email delivery, in-app AI execution or production monitoring is
  included. See the root README and Hermes guide for external setup responsibilities.

The historical `browser-test-results-20260727.md` is retained for context only.

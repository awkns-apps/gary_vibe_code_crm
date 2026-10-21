# Gary Vibe Code CRM

A standalone Next.js CRM with a public contact form, password-protected admin desk,
clients, contacts, deals, analyses, and agent runs. This project starts from the
application before the modular platform and Content Studio were introduced.

## Local setup

Requirements: Node.js 22.9 or newer, pnpm 9.15.9, and PostgreSQL.

```sh
git clone https://github.com/awkns-apps/gary_vibe_code_crm.git
cd gary_vibe_code_crm
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
```

Set these values in `.env.local`:

- `DATABASE_URL`: PostgreSQL connection string.
- `ADMIN_PASSWORD`: the password for `/admin/login`.
- `ADMIN_SESSION_SECRET`: a long random signing secret; generate one with
  `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
- `CRM_AGENT_API_TOKEN`: optional trusted-agent Bearer token; omit to disable it.

Environment files are ignored by Git, except for the empty example. Never commit
real credentials. Copying the previous project's database connection means both
projects share the same records. Use a separate database if data isolation is needed.

Create a PostgreSQL database first. For an already-running local PostgreSQL server
where your operating-system user has database creation privileges:

```sh
createdb gary_vibe_code_crm
```

Set `DATABASE_URL` to that database's connection URL (including its actual user,
password, host and port). A hosted PostgreSQL database also works; use the provider's
connection URL and TLS settings. The app does not install or start PostgreSQL for you.

For a **new empty database**, initialize all tables, including the contact inbox:

```sh
pnpm db:migrate
pnpm db:check
```

Migrations are transactional, recorded with checksums, and safe to rerun.
For an existing CRM database from the previous project, run only `pnpm db:check`.
The migration command refuses to initialize an existing CRM without migration
history, avoiding accidental changes to the shared database.

```sh
pnpm dev
```

Open http://localhost:3000 and sign in at http://localhost:3000/admin/login.

## Verification

```sh
pnpm lint
pnpm typecheck
pnpm build
pnpm db:check
pnpm test:smoke
```

`test:smoke` requires local PostgreSQL on port 5432, with your operating-system
user able to create a database. Run `pnpm build` first and keep port 3108 free.
It creates and deletes its own disposable local database and never uses the
configured `DATABASE_URL`. It checks migration reruns, session protections, CRM
create/edit operations, approval effects, page rendering, and agent authentication.

Production builds also enforce TypeScript checks. `db:check` verifies required
columns with read-only queries. Test create/edit and approval workflows against a
disposable database, especially when local configuration points to shared data.

## Deployment

Configure the same environment variables in the hosting provider. Local `.env.local`
is not uploaded by Git. Use `pnpm install --frozen-lockfile`, `pnpm build`, and
`pnpm start` (or the provider's Next.js integration). Initialize a fresh production
database before use. This repository does not configure hosting or deployment hooks.

## Using the app

1. Submit a message through the public contact form. It is saved to **網站詢問**;
   the app does not send an email or automatically create a client.
2. Sign in at `/admin/login`. The admin home is a searchable desk; type a client,
   deal or analysis name, or open **今日工作** for the dashboard.
3. Open **客戶** → create a client, optionally with a primary contact. Open the
   client detail to add timeline activities or start an analysis.
4. Open **商機管線** to create a deal or change its stage. Open **分析與報價** to
   review needs, market and pricing analyses.
5. Submit an analysis for review, then approve or reject it. Needs approval creates
   or links a deal, qualifies a lead and queues pricing. Pricing approval updates
   the linked deal's price and stage. Market approval has no pipeline effect.
6. Open **Agent 審核** for run status/errors and pending client change proposals.
   The app does not execute queued AI jobs itself.

The UI is primarily Traditional Chinese. It uses one shared admin password, not
individual user accounts. [Daily-use guide](docs/user-guide.md) explains each page,
review workflow, API-only operations and troubleshooting.

## Hermes and agent setup

Start with [the Hermes setup guide](docs/crm/hermes.md). There are two distinct modes:
local scripts with database access, or an HTTP client with `CRM_AGENT_API_TOKEN`.
The four local helper scripts read/write records but do not call an AI model or
install a scheduler. Hermes must supply the model, permissions and recurring job.
Do not run both modes on the same inquiries without an explicit ownership plan.

- [Agent integration and limitations](docs/crm/agent-integration.md)
- [Local script payloads and workflow](scripts/crm-analyst/README.md)
- [HTTP API reference](docs/crm/openapi.yaml)
- [Current verification coverage](docs/crm/verification.md)

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Incompatible lockfile | `pnpm --version` must match 9.15.9; use Corepack and reinstall with the frozen lockfile. |
| Login not configured | Set both admin variables in `.env.local`, then restart the server. |
| Login works locally but fails after deployment | Configure variables in the hosting environment too; use HTTPS and a consistent session secret across instances. |
| Database connection fails | Confirm PostgreSQL is reachable and `DATABASE_URL` is correct; run `pnpm db:check`. |
| Required relation is missing | Initialize a new database with `pnpm db:migrate`; do not run initialization against an unrelated or partially configured database. |
| Queued pricing never runs | Configure the external Hermes worker; the app only queues jobs. |
| Agent receives 401 | Configure the same nonempty `CRM_AGENT_API_TOKEN` on server and worker and send a Bearer header. |
| Proposal approval returns 422 | Automatic application supports `entityType: "client"` only. |

Existing deployments require operator-managed backups, monitoring, scheduling and
model credentials; those services are not provisioned by cloning this repository.

# Gary Vibe Code CRM

A standalone Next.js CRM with a public contact form, password-protected admin desk,
clients, contacts, deals, analyses, and agent runs. This project starts from the
application before the modular platform and Content Studio were introduced.

## Local setup

Requirements: Node.js 22.9 or newer, pnpm 9.15.9, and PostgreSQL.

```sh
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

Agent API documentation: [docs/crm/README.md](docs/crm/README.md).

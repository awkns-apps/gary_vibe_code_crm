import { createHash } from "node:crypto"
import { readdir, readFile } from "node:fs/promises"
import pg from "pg"

if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL before running migrations.")
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 })
try {
  await client.connect()
  await client.query("BEGIN")
  await client.query("SELECT pg_advisory_xact_lock(823514207)")
  const { rows: [existing] } = await client.query(`
    SELECT to_regclass('public.crm_clients') AS crm,
           to_regclass('public.crm_schema_migrations') AS ledger`)
  if (existing.crm && !existing.ledger) {
    throw new Error("This is an existing CRM database without migration history. Run pnpm db:check to verify it; automatic initialization is only supported for a new database.")
  }
  await client.query(`CREATE TABLE IF NOT EXISTS crm_schema_migrations (
    name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now()
  )`)
  const { rows } = await client.query("SELECT name, checksum FROM crm_schema_migrations")
  const applied = new Map(rows.map(row => [row.name, row.checksum]))
  const directory = new URL("../migrations/", import.meta.url)
  for (const name of (await readdir(directory)).filter(name => name.endsWith(".sql")).sort()) {
    const source = await readFile(new URL(name, directory), "utf8")
    const checksum = createHash("sha256").update(source).digest("hex")
    if (applied.has(name)) {
      if (applied.get(name) !== checksum) throw new Error(`Applied migration was modified: ${name}`)
      console.log(`Already applied: ${name}`)
      continue
    }
    // The runner owns the transaction; older SQL files also included boundaries.
    const sql = source.replace(/^\s*(BEGIN|COMMIT);\s*$/gmi, "")
    await client.query(sql)
    await client.query("INSERT INTO crm_schema_migrations (name, checksum) VALUES ($1, $2)", [name, checksum])
    console.log(`Applied: ${name}`)
  }
  await client.query("COMMIT")
  console.log("Database migrations complete.")
} catch (error) {
  await client.query("ROLLBACK").catch(() => {})
  console.error(error.message)
  process.exitCode = 1
} finally {
  await client.end()
}

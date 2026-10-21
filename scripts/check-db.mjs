import { readFile } from "node:fs/promises"
import pg from "pg"

if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL before checking the database.")
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 })
try {
  await client.connect()
  await client.query("BEGIN READ ONLY")
  // Parse the checked-in foundation declarations to verify every required column.
  for (const file of ["0000_contact_messages.sql", "0001_crm_foundation.sql"]) {
    const source = await readFile(new URL(`../migrations/${file}`, import.meta.url), "utf8")
    for (const [, table, body] of source.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?(\w+) \(([\s\S]*?)\n\);/g)) {
      const columns = body.split("\n").map(line => line.trim().match(/^(\w+)\s/)?.[1]).filter(Boolean)
      // Names come only from repository-owned SQL, never from user input.
      await client.query(`SELECT ${columns.map(name => `"${name}"`).join(", ")} FROM "${table}" LIMIT 0`)
      console.log(`OK: ${table}`)
    }
  }
  await client.query("ROLLBACK")
  console.log("All required tables and columns are accessible (read-only check).")
} catch (error) {
  console.error(`Database check failed: ${error.message}`)
  process.exitCode = 1
} finally {
  await client.end()
}

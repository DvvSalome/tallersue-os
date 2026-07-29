import { readFileSync } from "node:fs";
import { Client } from "pg";

function loadEnvLocal() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx);
    let value = trimmed.slice(idx + 1);
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[key] = value;
  }
  return env;
}

const env = loadEnvLocal();
const rawConnectionString = env.POSTGRES_URL_NON_POOLING;
if (!rawConnectionString) {
  console.error("POSTGRES_URL_NON_POOLING not found in .env.local");
  process.exit(1);
}
// Strip sslmode from the URL so it doesn't override the explicit ssl option
// below (newer pg-connection-string treats sslmode=require as verify-full,
// which fails against Supabase's pooler cert chain from Node's default CAs).
const connectionString = rawConnectionString.replace(/[?&]sslmode=[^&]*/, "");

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: node scripts/run-sql.mjs <file.sql> [file2.sql ...]");
  process.exit(1);
}

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  for (const file of files) {
    const sql = readFileSync(file, "utf8");
    console.log(`Running ${file}...`);
    await client.query(sql);
    console.log(`OK: ${file}`);
  }
} catch (err) {
  console.error("SQL execution failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

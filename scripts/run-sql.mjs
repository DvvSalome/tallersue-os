import { readFileSync } from "node:fs";
import { Client } from "pg";
import { resolve6, resolve4 } from "node:dns/promises";

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

// El host directo de Supabase solo publica registro AAAA. Cuando la red no
// tiene ruta IPv6 global, macOS filtra ese resultado y Node falla con ENOTFOUND
// aunque `host -t AAAA` sí resuelva. En ese caso se resuelve la dirección a mano
// y se conecta al literal: el certificado no se valida por nombre porque ya se
// usa rejectUnauthorized:false para la cadena del pooler de Supabase.
async function construirCliente() {
  const base = { connectionString, ssl: { rejectUnauthorized: false } };
  const host = new URL(connectionString).hostname;
  try {
    await resolve4(host);
    return new Client(base);
  } catch {
    // sin A record: intentar IPv6 explícito
  }
  try {
    const [ipv6] = await resolve6(host);
    if (ipv6) {
      console.log(`Nota: ${host} solo tiene IPv6; conectando a [${ipv6}]`);
      // `connectionString` gana sobre `host`, así que hay que pasar los campos
      // por separado para que el literal surta efecto.
      const u = new URL(connectionString);
      return new Client({
        user: decodeURIComponent(u.username),
        password: decodeURIComponent(u.password),
        host: ipv6,
        port: Number(u.port || 5432),
        database: u.pathname.replace(/^\//, "") || "postgres",
        ssl: { rejectUnauthorized: false },
      });
    }
  } catch {
    // se deja fallar con el mensaje original de pg
  }
  return new Client(base);
}

const client = await construirCliente();

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

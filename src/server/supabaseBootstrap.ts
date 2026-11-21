import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

let bootstrapAttempted = false;
let lastBootstrapDiagnostic = 'not_attempted';

export function getLastBootstrapDiagnostic(): string {
  return lastBootstrapDiagnostic;
}

export function resetBootstrapAttempt() {
  bootstrapAttempted = false;
}

export function extractProjectRefFromJwt(key: string | undefined): string | null {
  if (!key || !key.startsWith('eyJ')) return null;
  try {
    const parts = key.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (payload?.iss === 'supabase' && typeof payload?.ref === 'string' && /^[a-z0-9]+$/i.test(payload.ref)) {
      return payload.ref;
    }
  } catch {
    // Ignore malformed token
  }
  return null;
}

function getCandidatePasswords(): string[] {
  const candidates = new Set<string>();
  const dbPass = process.env.SUPABASE_DB_PASSWORD?.trim().replace(/^["']|["']$/g, '');
  if (dbPass) candidates.add(dbPass);

  const rawUrl = process.env.SUPABASE_URL?.trim().replace(/^["']|["']$/g, '');
  if (rawUrl && !rawUrl.startsWith('http') && !rawUrl.includes('.supabase.co')) {
    candidates.add(rawUrl);
  }

  const adminPass = process.env.ADMIN_PASSCODE?.trim().replace(/^["']|["']$/g, '');
  if (adminPass) candidates.add(adminPass);

  return Array.from(candidates);
}

const POOLER_REGIONS = [
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'eu-central-2',
  'eu-north-1',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'sa-east-1',
  'ca-central-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-south-1',
];

interface ProbeTarget {
  host: string;
  port: number;
  user: string;
  password: string;
}

type ProbeOutcome =
  | { status: 'connected'; target: ProbeTarget }
  | { status: 'auth_failed' }
  | { status: 'tenant_missing' }
  | { status: 'network_error'; code: string };

async function probeTarget(target: ProbeTarget): Promise<ProbeOutcome> {
  const client = new Client({
    host: target.host,
    port: target.port,
    user: target.user,
    password: target.password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 3500,
    query_timeout: 5000,
  });

  try {
    await client.connect();
    await client.query('select 1');
    return { status: 'connected', target };
  } catch (err: unknown) {
    const pgErr = err as { code?: string; message?: string };
    const msg = String(pgErr?.message || '');
    const code = String(pgErr?.code || '');
    if (code === '28P01' || msg.includes('password authentication failed')) {
      return { status: 'auth_failed' };
    }
    if (msg.includes('Tenant or user not found')) {
      return { status: 'tenant_missing' };
    }
    return { status: 'network_error', code: code || 'CONNECT_ERR' };
  } finally {
    await client.end().catch(() => {});
  }
}

async function runSqlOnTarget(target: ProbeTarget, sql: string): Promise<boolean> {
  const client = new Client({
    host: target.host,
    port: target.port,
    user: target.user,
    password: target.password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
    query_timeout: 15000,
  });

  try {
    await client.connect();
    await client.query(sql);
    await client.query("NOTIFY pgrst, 'reload schema';");
    lastBootstrapDiagnostic = 'schema_applied';
    return true;
  } catch (err: unknown) {
    const pgErr = err as { code?: string; message?: string };
    lastBootstrapDiagnostic = `sql_error:${pgErr?.code || 'UNKNOWN'}`;
    console.error('Supabase SQL execution error:', pgErr?.code || pgErr?.message);
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

export async function executeSupabaseSql(projectRef: string, sql: string): Promise<boolean> {
  const connStr =
    process.env.SUPABASE_DB_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim();
  if (connStr && (connStr.startsWith('postgres://') || connStr.startsWith('postgresql://'))) {
    const client = new Client({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });
    try {
      await client.connect();
      await client.query(sql);
      await client.query("NOTIFY pgrst, 'reload schema';");
      lastBootstrapDiagnostic = 'schema_applied_connstr';
      return true;
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      lastBootstrapDiagnostic = `connstr_error:${pgErr?.code || 'ERR'}`;
    } finally {
      await client.end().catch(() => {});
    }
  }

  const passwords = getCandidatePasswords();
  if (passwords.length === 0) {
    lastBootstrapDiagnostic = 'no_candidate_passwords';
    return false;
  }

  let sawAuthFailed = false;
  const networkCodes = new Set<string>();

  for (const password of passwords) {
    const directResult = await probeTarget({
      host: `db.${projectRef}.supabase.co`,
      port: 5432,
      user: 'postgres',
      password,
    });
    if (directResult.status === 'connected') {
      const ok = await runSqlOnTarget(directResult.target, sql);
      if (ok) return true;
    } else if (directResult.status === 'auth_failed') {
      sawAuthFailed = true;
      continue;
    } else if (directResult.status === 'network_error') {
      networkCodes.add(directResult.code);
    }

    const poolTargets: ProbeTarget[] = [];
    for (const region of POOLER_REGIONS) {
      poolTargets.push({
        host: `aws-0-${region}.pooler.supabase.com`,
        port: 5432,
        user: `postgres.${projectRef}`,
        password,
      });
      poolTargets.push({
        host: `aws-1-${region}.pooler.supabase.com`,
        port: 5432,
        user: `postgres.${projectRef}`,
        password,
      });
    }

    const outcomes = await Promise.all(poolTargets.map((t) => probeTarget(t)));
    const winner = outcomes.find((o): o is { status: 'connected'; target: ProbeTarget } => o.status === 'connected');
    if (winner) {
      const ok = await runSqlOnTarget(winner.target, sql);
      if (ok) return true;
    }

    if (outcomes.some((o) => o.status === 'auth_failed')) {
      sawAuthFailed = true;
    }
    outcomes.forEach((o) => {
      if (o.status === 'network_error') networkCodes.add(o.code);
    });
  }

  if (sawAuthFailed) {
    lastBootstrapDiagnostic = 'auth_failed';
  } else if (networkCodes.size > 0) {
    lastBootstrapDiagnostic = `network_error:${Array.from(networkCodes).slice(0, 3).join(',')}`;
  } else {
    lastBootstrapDiagnostic = 'tenant_or_host_not_found';
  }
  return false;
}

export async function bootstrapSupabaseSchemaIfMissing(projectRef: string): Promise<boolean> {
  if (bootstrapAttempted) return false;
  bootstrapAttempted = true;

  const schemaPath = path.resolve(process.cwd(), 'supabase/schema.sql');
  if (!fs.existsSync(schemaPath)) {
    lastBootstrapDiagnostic = 'schema_file_missing';
    return false;
  }
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  return executeSupabaseSql(projectRef, schemaSql);
}

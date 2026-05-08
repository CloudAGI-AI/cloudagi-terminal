import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const TABLE = "cloudagi_waitlist";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = new Set(["seller", "buyer", "builder"]);

interface InsertBody {
  email?: string;
  role?: string;
  source?: string;
}

function supabaseConfigured(): { url: string; key: string } | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  return { url: SUPABASE_URL, key: SUPABASE_ANON_KEY };
}

async function getCount(cfg: { url: string; key: string }): Promise<number> {
  const res = await fetch(`${cfg.url}/rest/v1/${TABLE}?select=id`, {
    method: "HEAD",
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      Prefer: "count=exact",
      Range: "0-0",
    },
    cache: "no-store",
  });
  const range = res.headers.get("content-range");
  if (range && range.includes("/")) {
    const total = range.split("/")[1];
    if (total && total !== "*") return Number.parseInt(total, 10) || 0;
  }
  return 0;
}

async function findExisting(cfg: { url: string; key: string }, email: string): Promise<boolean> {
  const url = `${cfg.url}/rest/v1/${TABLE}?email=ilike.${encodeURIComponent(email)}&select=id&limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
    },
    cache: "no-store",
  });
  if (!res.ok) return false;
  const rows = (await res.json().catch(() => [])) as unknown[];
  return Array.isArray(rows) && rows.length > 0;
}

async function insertEntry(
  cfg: { url: string; key: string },
  entry: { email: string; role: string; source: string; ip: string | null },
): Promise<{ ok: boolean; conflict: boolean; status: number }> {
  const res = await fetch(`${cfg.url}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      Prefer: "return=minimal,resolution=ignore-duplicates",
    },
    body: JSON.stringify([entry]),
    cache: "no-store",
  });
  return { ok: res.ok, conflict: res.status === 409, status: res.status };
}

export async function POST(request: Request) {
  const cfg = supabaseConfigured();
  if (!cfg) {
    return NextResponse.json(
      { error: "Waitlist storage not configured" },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as InsertBody | null;
  if (!body || typeof body.email !== "string" || !EMAIL_RE.test(body.email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const role =
    typeof body.role === "string" && ROLES.has(body.role) ? body.role : "buyer";
  const source =
    typeof body.source === "string" ? body.source.slice(0, 64) : "landing";
  const email = body.email.trim().toLowerCase();

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null;

  const alreadyOnList = await findExisting(cfg, email);
  if (alreadyOnList) {
    const count = await getCount(cfg);
    return NextResponse.json({ ok: true, duplicate: true, count }, { status: 200 });
  }

  const result = await insertEntry(cfg, { email, role, source, ip });
  if (!result.ok && !result.conflict) {
    return NextResponse.json(
      { error: `Insert failed (${result.status})` },
      { status: 502 },
    );
  }

  const count = await getCount(cfg);
  return NextResponse.json(
    { ok: true, count, duplicate: result.conflict },
    { status: result.conflict ? 200 : 201 },
  );
}

export async function GET() {
  const cfg = supabaseConfigured();
  if (!cfg) return NextResponse.json({ count: 0 });
  const count = await getCount(cfg);
  return NextResponse.json({ count });
}

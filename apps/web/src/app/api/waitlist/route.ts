import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STORE_PATH = path.join(process.cwd(), ".waitlist", "entries.jsonl");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = new Set(["seller", "buyer", "builder"]);

interface Entry {
  email: string;
  role: string;
  source: string;
  created_at: string;
  ip?: string;
}

async function ensureStore() {
  const dir = path.dirname(STORE_PATH);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(STORE_PATH, "", "utf8");
  }
}

async function appendEntry(entry: Entry): Promise<number> {
  await ensureStore();
  await fs.appendFile(STORE_PATH, JSON.stringify(entry) + "\n", "utf8");
  const data = await fs.readFile(STORE_PATH, "utf8");
  return data.split("\n").filter(Boolean).length;
}

async function isDuplicate(email: string): Promise<boolean> {
  await ensureStore();
  const data = await fs.readFile(STORE_PATH, "utf8");
  return data.split("\n").filter(Boolean).some((line) => {
    try {
      const parsed = JSON.parse(line) as { email?: string };
      return parsed.email?.toLowerCase() === email.toLowerCase();
    } catch {
      return false;
    }
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; role?: string; source?: string }
    | null;

  if (!body || typeof body.email !== "string" || !EMAIL_RE.test(body.email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const role = typeof body.role === "string" && ROLES.has(body.role) ? body.role : "buyer";
  const source = typeof body.source === "string" ? body.source.slice(0, 64) : "landing";
  const email = body.email.trim().toLowerCase();

  if (await isDuplicate(email)) {
    const data = await fs.readFile(STORE_PATH, "utf8");
    const count = data.split("\n").filter(Boolean).length;
    return NextResponse.json({ ok: true, duplicate: true, count }, { status: 200 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    undefined;

  const entry: Entry = {
    email,
    role,
    source,
    created_at: new Date().toISOString(),
    ip,
  };

  const count = await appendEntry(entry);

  return NextResponse.json({ ok: true, count }, { status: 201 });
}

export async function GET() {
  try {
    const data = await fs.readFile(STORE_PATH, "utf8").catch(() => "");
    const count = data.split("\n").filter(Boolean).length;
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}

import { NextResponse } from "next/server";
import { getCloudflareAccessUser } from "../../../cloudflare-auth";
import { getDailySession, saveDailySession } from "../../../../db";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ date: string }> };

function validTrainingDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "2026-01-01") return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getCloudflareAccessUser();
  const { date } = await params;
  if (!user) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
  if (!validTrainingDate(date)) return NextResponse.json({ error: "Choose a valid date on or after 2026-01-01." }, { status: 400 });

  try {
    return NextResponse.json(await getDailySession(user.id, date));
  } catch (error) {
    console.error("Could not load training day", error);
    return NextResponse.json({ error: "Could not load this training day." }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  const user = await getCloudflareAccessUser();
  const { date } = await params;
  if (!user) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
  if (!validTrainingDate(date)) return NextResponse.json({ error: "Choose a valid date on or after 2026-01-01." }, { status: 400 });

  const body = (await request.json().catch(() => null)) as { trained?: unknown; hours?: unknown } | null;
  if (!body || typeof body.trained !== "boolean") {
    return NextResponse.json({ error: "Training status is required." }, { status: 400 });
  }

  const hours = body.trained ? Number(body.hours) : null;
  if (body.trained && (!Number.isFinite(hours) || hours === null || hours < 0.25 || hours > 24)) {
    return NextResponse.json({ error: "Hours must be between 0.25 and 24." }, { status: 400 });
  }

  try {
    await saveDailySession(user.id, date, hours === null ? null : Math.round(hours * 100) / 100);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Could not save training day", error);
    return NextResponse.json({ error: "Could not save this training day." }, { status: 500 });
  }
}

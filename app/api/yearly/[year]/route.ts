import { NextResponse } from "next/server";
import { getCloudflareAccessUser } from "../../../cloudflare-auth";
import { saveYearlyTotal } from "../../../../db";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ year: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  const user = await getCloudflareAccessUser();
  const { year: rawYear } = await params;
  const year = Number(rawYear);
  if (!user) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
  if (year !== 2024 && year !== 2025) return NextResponse.json({ error: "Only 2024 and 2025 can be backfilled." }, { status: 400 });

  const body = (await request.json().catch(() => null)) as { hours?: unknown } | null;
  const hours = Number(body?.hours);
  if (!Number.isFinite(hours) || hours < 0 || hours > 5000) {
    return NextResponse.json({ error: "Hours must be between 0 and 5,000." }, { status: 400 });
  }

  try {
    await saveYearlyTotal(user.id, year, Math.round(hours * 100) / 100);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Could not save yearly total", error);
    return NextResponse.json({ error: "Could not save the yearly total." }, { status: 500 });
  }
}

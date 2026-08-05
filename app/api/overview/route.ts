import { NextResponse } from "next/server";
import { getCloudflareAccessUser } from "../../cloudflare-auth";
import { getOverview } from "../../../db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCloudflareAccessUser();
  if (!user) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

  try {
    return NextResponse.json(await getOverview(user.id));
  } catch (error) {
    console.error("Could not load training overview", error);
    return NextResponse.json({ error: "Could not load your training history." }, { status: 500 });
  }
}

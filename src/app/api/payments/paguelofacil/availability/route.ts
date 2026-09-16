import { NextResponse } from "next/server";
import { getPagueloFacilAvailability } from "@/lib/paguelofacil";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public probe — frontend hides the PagueloFácil CTA when unavailable. */
export async function GET() {
  return NextResponse.json(getPagueloFacilAvailability());
}

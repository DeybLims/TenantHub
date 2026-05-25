import { NextResponse } from "next/server";
import { normalizeTenants } from "@/lib/normalizeTenants";
import { fetchFromSheets } from "@/lib/sheetsClient";

export async function GET() {
  try {
    const data = await fetchFromSheets("getTenants");
    const tenants = normalizeTenants(data);
    return NextResponse.json(tenants);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch tenants";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { normalizeTenants } from "@/lib/normalizeTenants";
import { fetchFromSheets } from "@/lib/sheetsClient";

const GOOGLE_APPS_SCRIPT_URL =
  process.env.NEXT_PUBLIC_SHEETS_API_URL ??
  "https://script.google.com/macros/s/AKfycbz8H1VJGEPc3KOdNJ8Kn_OcT34MlXddi2axbUjLY9EeZgEHqlbsrThwdX1EAfqBCxep/exec";

function parseSheetsResponse(raw: string): {
  ok: boolean;
  data: unknown;
  message: string;
} {
  try {
    const parsed = JSON.parse(raw) as {
      success?: boolean;
      message?: string;
      error?: string;
    };

    if (parsed.success === false) {
      return {
        ok: false,
        data: parsed,
        message: parsed.message ?? parsed.error ?? "Request failed",
      };
    }

    return { ok: true, data: parsed, message: "" };
  } catch {
    return { ok: true, data: { success: true, message: raw.trim() }, message: "" };
  }
}

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

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();

    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      cache: "no-store",
      redirect: "follow",
      body: JSON.stringify(body),
    });

    const raw = await response.text();
    const parsed = parseSheetsResponse(raw);

    if (!response.ok) {
      return NextResponse.json(
        { error: parsed.message || `Sheets API returned ${response.status}` },
        { status: response.status },
      );
    }

    if (!parsed.ok) {
      return NextResponse.json({ success: false, message: parsed.message }, { status: 400 });
    }

    return NextResponse.json(parsed.data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reach Sheets API";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

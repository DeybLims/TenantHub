import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/dataSource";
import { normalizeTenants } from "@/lib/normalizeTenants";
import { fetchFromSheets } from "@/lib/sheetsClient";
import {
  fetchSupabaseTenants,
  saveSupabaseTenant,
} from "@/lib/supabase/repository";

const GOOGLE_APPS_SCRIPT_URL =
  process.env.NEXT_PUBLIC_SHEETS_API_URL ??
  "https://script.google.com/macros/s/AKfycbxOEKjwP5UXWUJLcsnqNZGWWUOOKTAF9XP5Ldx2Rx4ymHrIO0RoEQldrpnFqcGQH7ao/exec";

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
    if (isSupabaseConfigured()) {
      const tenants = await fetchSupabaseTenants();
      return NextResponse.json(tenants);
    }

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
    const body = (await request.json()) as {
      action?: string;
      data?: Record<string, unknown>;
    };

    if (isSupabaseConfigured()) {
      if (body.action === "saveTenant" && body.data) {
        const result = await saveSupabaseTenant(body.data);
        const status = result.success ? 200 : 400;
        return NextResponse.json(result, { status });
      }

      if (body.action === "deleteTenant" && body.data) {
        const result = await saveSupabaseTenant({
          ...body.data,
          name: "",
          status: "Vacant",
        });
        const status = result.success ? 200 : 400;
        return NextResponse.json(result, { status });
      }

      return NextResponse.json(
        { success: false, message: "Invalid payload execution action" },
        { status: 400 },
      );
    }

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
      error instanceof Error ? error.message : "Failed to save tenant";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

import { NextRequest, NextResponse } from "next/server";

const GOOGLE_APPS_SCRIPT_URL =
  process.env.NEXT_PUBLIC_SHEETS_API_URL ??
  "https://script.google.com/macros/s/AKfycbyg03qS3-czX48MbmXNXAMgP7wtkyktmNy3N8hG0hh3NAaon_fxNAPgy3KV1NRhhWlA/exec";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get("action") ?? "getBilling";
  const month = searchParams.get("month");

  const url = new URL(GOOGLE_APPS_SCRIPT_URL);
  url.searchParams.set("action", action);
  if (month) {
    url.searchParams.set("month", month);
  }

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      redirect: "follow",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Sheets API returned ${response.status}` },
        { status: response.status },
      );
    }

    const raw = await response.text();

    try {
      const data: unknown = JSON.parse(raw);
      return NextResponse.json(data);
    } catch {
      const preview = raw.trim().slice(0, 120);
      const hint =
        preview === "API Active"
          ? "The script is running but only returns a health-check message. Update doGet() to handle ?action=getBilling&month=VALUE and return billing JSON."
          : `Expected JSON but received: "${preview}"`;

      return NextResponse.json({ error: hint }, { status: 502 });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reach Sheets API";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

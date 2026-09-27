import { NextRequest, NextResponse } from "next/server";
import type { ExpenseRecord } from "@/components/expenses/types";
import { isSupabaseConfigured } from "@/lib/dataSource";
import {
  fetchSupabaseUtilityExpense,
  saveSupabaseUtilityExpense,
} from "@/lib/supabase/repository";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ configured: false, record: null });
  }

  const month = request.nextUrl.searchParams.get("month") ?? "";
  try {
    const record = await fetchSupabaseUtilityExpense(month);
    return NextResponse.json({ configured: true, record });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch utility expenses";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { success: false, message: "Supabase is not configured." },
      { status: 400 },
    );
  }

  try {
    const body = (await request.json()) as { data?: ExpenseRecord };
    if (!body.data) {
      return NextResponse.json(
        { success: false, message: "Missing utility expense data." },
        { status: 400 },
      );
    }

    const result = await saveSupabaseUtilityExpense(body.data);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save utility expenses";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

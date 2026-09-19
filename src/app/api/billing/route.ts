import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/dataSource";
import {
  billUserNotes,
  buildPaymentActivityNoteLine,
} from "@/lib/mapBillingViewModel";
import {
  generateSupabaseBill,
  updateSupabaseBill,
} from "@/lib/supabase/repository";
import type { GenerateBillPayload, UpdateBillPayload } from "@/types/billing";

const GOOGLE_APPS_SCRIPT_URL =
  process.env.NEXT_PUBLIC_SHEETS_API_URL ??
  "https://script.google.com/macros/s/AKfycbxOEKjwP5UXWUJLcsnqNZGWWUOOKTAF9XP5Ldx2Rx4ymHrIO0RoEQldrpnFqcGQH7ao/exec";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      action?: string;
      data?: GenerateBillPayload | UpdateBillPayload;
    };

    if (isSupabaseConfigured()) {
      if (body.action === "generateBill" && body.data) {
        const result = await generateSupabaseBill(body.data as GenerateBillPayload);
        const status = result.success ? 200 : 400;
        return NextResponse.json(result, { status });
      }

      if (body.action === "updateBill" && body.data) {
        const result = await updateSupabaseBill(body.data as UpdateBillPayload);
        const status = result.success ? 200 : 400;
        return NextResponse.json(result, { status });
      }

      return NextResponse.json(
        { success: false, message: "Invalid payload execution action" },
        { status: 400 },
      );
    }

    // Sheets fallback: encode each payment as a dated activity line in Notes.
    let sheetsBody = body;
    if (body.action === "updateBill" && body.data) {
      const data = body.data as UpdateBillPayload;
      if (data.paymentActivity && data.paymentActivity.amount > 0) {
        const activityLine = buildPaymentActivityNoteLine({
          paymentDate: data.paymentActivity.paymentDate,
          method: data.paymentActivity.method,
          amount: data.paymentActivity.amount,
          reference: data.paymentActivity.reference,
        });
        const notes = [billUserNotes(data.notes), activityLine]
          .filter(Boolean)
          .join("\n");
        sheetsBody = {
          ...body,
          data: { ...data, notes, paymentActivity: undefined },
        };
      }
    }

    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      cache: "no-store",
      redirect: "follow",
      body: JSON.stringify(sheetsBody),
    });

    const raw = await response.text();

    if (!response.ok) {
      let message = `Sheets API returned ${response.status}`;
      try {
        const parsed = JSON.parse(raw) as { error?: string };
        if (parsed.error) message = parsed.error;
      } catch {
        if (raw.trim()) message = raw.trim().slice(0, 200);
      }
      return NextResponse.json({ error: message }, { status: response.status });
    }

    try {
      return NextResponse.json(JSON.parse(raw));
    } catch {
      return NextResponse.json({ success: true, message: raw.trim() });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update billing";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

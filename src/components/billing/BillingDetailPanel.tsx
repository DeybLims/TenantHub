"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPesoDecimal } from "@/lib/format";
import { calculateBillingTotalDue } from "@/lib/buildUpdateBillPayload";
import { readSheetNumber } from "@/lib/readSheetNumber";
import { getTenantInitials } from "@/lib/tenantInitials";
import {
  FloatingLabelField,
  floatingInputClass,
} from "@/components/ui/FloatingLabelField";
import type { BillingTableRow, BillingDetailSaveData } from "@/types/billing";
import type { SheetRow } from "@/types/sheet";

interface BillingDetailPanelProps {
  row: BillingTableRow;
  sheetRow: SheetRow | undefined;
  onSave?: (data: BillingDetailSaveData) => void;
  onExportPdf?: () => void;
  isSaving?: boolean;
  saveError?: string | null;
}

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function BillingDetailPanel({
  row,
  sheetRow,
  onSave,
  onExportPdf,
  isSaving = false,
  saveError = null,
}: BillingDetailPanelProps) {
  const [status, setStatus] = useState(row.status);
  const [billingDate, setBillingDate] = useState(
    toDateInputValue(sheetRow?.BillingDate),
  );
  const [dueDate, setDueDate] = useState(toDateInputValue(sheetRow?.DueDate));
  const [baseRent, setBaseRent] = useState(String(row.rent));
  const [elecBill, setElecBill] = useState(String(row.elecBill));
  const [elecPrev, setElecPrev] = useState(String(row.elecPrev));
  const [elecCurr, setElecCurr] = useState(String(row.elecCurr));
  const [waterBill, setWaterBill] = useState(String(row.waterBill));
  const [waterPrev, setWaterPrev] = useState(String(row.waterPrev));
  const [waterCurr, setWaterCurr] = useState(String(row.waterCurr));
  const [otherCharges, setOtherCharges] = useState(String(row.otherCharges));
  const [amountPaid, setAmountPaid] = useState(String(row.paid));
  const [notes, setNotes] = useState(sheetRow?.Notes ?? "");

  useEffect(() => {
    setStatus(row.status);
    setBillingDate(toDateInputValue(sheetRow?.BillingDate));
    setDueDate(toDateInputValue(sheetRow?.DueDate));
    setBaseRent(String(row.rent));
    setElecBill(String(row.elecBill));
    setElecPrev(String(row.elecPrev));
    setElecCurr(String(row.elecCurr));
    setWaterBill(String(row.waterBill));
    setWaterPrev(String(row.waterPrev));
    setWaterCurr(String(row.waterCurr));
    setOtherCharges(String(row.otherCharges));
    setAmountPaid(String(row.paid));
    setNotes(sheetRow?.Notes ?? "");
  }, [row, sheetRow]);

  const totalDue = useMemo(
    () =>
      calculateBillingTotalDue({
        baseRent,
        elecBill,
        waterBill,
        otherCharges,
      }),
    [baseRent, elecBill, waterBill, otherCharges],
  );

  const balance = totalDue - readSheetNumber(amountPaid);

  return (
    <article className="flex h-full flex-col rounded-xl bg-surface-card shadow-card">
      <div className="border-b border-gray-100 px-5 py-4">
        <h2 className="text-base font-semibold text-navy">Billing Details</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="mb-5 flex flex-col items-center text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-brand-blue text-lg font-bold text-white">
            {getTenantInitials(row.tenantName)}
          </div>
          <h3 className="text-lg font-bold uppercase text-navy">
            {row.tenantName}
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Unit: {row.unitCode} | Room: {row.room}
          </p>
        </div>

        <div className="space-y-4">
          <FloatingLabelField label="Status">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className={floatingInputClass}
            >
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Partial">Partial</option>
              <option value="Vacant">Vacant</option>
            </select>
          </FloatingLabelField>

          <FloatingLabelField label="Billing Date">
            <input
              type="date"
              value={billingDate}
              onChange={(event) => setBillingDate(event.target.value)}
              className={floatingInputClass}
            />
          </FloatingLabelField>

          <FloatingLabelField label="Due Date">
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className={floatingInputClass}
            />
          </FloatingLabelField>

          <p className="pt-1 text-sm font-bold text-navy">Charges</p>

          <FloatingLabelField label="Base Rent">
            <input
              type="number"
              value={baseRent}
              onChange={(event) => setBaseRent(event.target.value)}
              className={floatingInputClass}
            />
          </FloatingLabelField>

          <div className="grid grid-cols-3 gap-2">
            <FloatingLabelField label="Electricity">
              <input
                type="number"
                value={elecBill}
                onChange={(event) => setElecBill(event.target.value)}
                className={floatingInputClass}
              />
            </FloatingLabelField>
            <FloatingLabelField label="Previous">
              <input
                type="number"
                value={elecPrev}
                onChange={(event) => setElecPrev(event.target.value)}
                className={floatingInputClass}
              />
            </FloatingLabelField>
            <FloatingLabelField label="Current">
              <input
                type="number"
                value={elecCurr}
                onChange={(event) => setElecCurr(event.target.value)}
                className={floatingInputClass}
              />
            </FloatingLabelField>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <FloatingLabelField label="Water">
              <input
                type="number"
                value={waterBill}
                onChange={(event) => setWaterBill(event.target.value)}
                className={floatingInputClass}
              />
            </FloatingLabelField>
            <FloatingLabelField label="Previous">
              <input
                type="number"
                value={waterPrev}
                onChange={(event) => setWaterPrev(event.target.value)}
                className={floatingInputClass}
              />
            </FloatingLabelField>
            <FloatingLabelField label="Current">
              <input
                type="number"
                value={waterCurr}
                onChange={(event) => setWaterCurr(event.target.value)}
                className={floatingInputClass}
              />
            </FloatingLabelField>
          </div>

          <FloatingLabelField label="Other Charges">
            <input
              type="number"
              value={otherCharges}
              onChange={(event) => setOtherCharges(event.target.value)}
              className={floatingInputClass}
            />
          </FloatingLabelField>

          <FloatingLabelField label="Total Due">
            <input
              type="text"
              readOnly
              value={formatPesoDecimal(totalDue)}
              className={`${floatingInputClass} cursor-not-allowed bg-gray-50 font-bold`}
            />
          </FloatingLabelField>

          <FloatingLabelField label="Amount Paid">
            <input
              type="number"
              value={amountPaid}
              onChange={(event) => setAmountPaid(event.target.value)}
              className={floatingInputClass}
            />
          </FloatingLabelField>

          <FloatingLabelField label="Balance">
            <input
              type="text"
              readOnly
              value={formatPesoDecimal(balance)}
              className={`${floatingInputClass} ${
                balance > 0 ? "text-red-600" : "text-emerald-700"
              }`}
            />
          </FloatingLabelField>

          <FloatingLabelField label="Notes">
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Add notes here..."
              className={`${floatingInputClass} resize-none`}
            />
          </FloatingLabelField>

          {saveError && (
            <p className="text-sm text-red-600" role="alert">
              {saveError}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-3 border-t border-gray-100 px-5 py-4">
        <button
          type="button"
          disabled={isSaving}
          onClick={() =>
            onSave?.({
              status,
              billingDate,
              dueDate,
              baseRent,
              elecBill,
              elecPrev,
              elecCurr,
              waterBill,
              waterPrev,
              waterCurr,
              otherCharges,
              totalDue: String(totalDue),
              amountPaid,
              notes,
            })
          }
          className="flex-1 rounded-lg bg-brand-blue py-2.5 text-sm font-semibold text-white hover:bg-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving…" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={onExportPdf}
          className="flex-1 rounded-lg bg-brand-emerald py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          Export to PDF
        </button>
      </div>
    </article>
  );
}

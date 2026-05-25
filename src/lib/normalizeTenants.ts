import type { TenantRecord } from "@/types/tenant";

function isTenantApiRow(row: unknown): row is Record<string, unknown> {
  return (
    typeof row === "object" &&
    row !== null &&
    "Room" in row &&
    "Name" in row
  );
}

function readNumber(value: unknown): number {
  if (value === "" || value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeStatus(value: unknown): string {
  const status = String(value ?? "").trim();
  if (status.toLowerCase() === "vacant") return "Vacant";
  return "Active";
}

function readUnitCode(row: Record<string, unknown>): string {
  const raw = row["Unit Code"] ?? row.UnitCode;
  if (raw != null && String(raw).trim()) {
    return String(raw).trim();
  }
  return "";
}

export function normalizeTenants(data: unknown): TenantRecord[] {
  if (!Array.isArray(data)) {
    throw new Error("Invalid tenants response: expected a JSON array");
  }

  if (data.length === 0) {
    return [];
  }

  if (isTenantApiRow(data[0])) {
    return data
      .filter(isTenantApiRow)
      .map((row) => ({
        UnitCode: readUnitCode(row),
        Room: readNumber(row.Room),
        Name: String(row.Name ?? "").trim(),
        Rent: readNumber(row.Rent),
        MoveIn: String(row.MoveIn ?? ""),
        Deposit: readNumber(row.Deposit),
        Status: normalizeStatus(row.Status),
      }))
      .filter((row) => row.Room > 0)
      .sort((a, b) => a.Room - b.Room);
  }

  return [];
}

export function getMockTenants(): TenantRecord[] {
  return [
    {
      UnitCode: "APT-101",
      Room: 1,
      Name: "Joel",
      Rent: 10000,
      MoveIn: "2024-03-01",
      Deposit: 20000,
      Status: "Active",
    },
    {
      UnitCode: "APT-102",
      Room: 2,
      Name: "Carol",
      Rent: 8000,
      MoveIn: "2023-11-15",
      Deposit: 16000,
      Status: "Active",
    },
    {
      UnitCode: "APT-103",
      Room: 3,
      Name: "John Wayne Capili",
      Rent: 5000,
      MoveIn: "2025-01-10",
      Deposit: 10000,
      Status: "Active",
    },
    {
      UnitCode: "COM-201",
      Room: 7,
      Name: "Vacant Unit",
      Rent: 12000,
      MoveIn: "",
      Deposit: 0,
      Status: "Vacant",
    },
  ];
}

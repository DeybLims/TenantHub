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

function readString(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function normalizeStatus(value: unknown): string {
  const status = String(value ?? "").trim();
  if (status.toLowerCase() === "vacant") return "Vacant";
  return "Active";
}

function readUnitCode(row: Record<string, unknown>): string {
  const raw = row["Unit Code"] ?? row.UnitCode;
  return readString(raw);
}

function readTenantField(
  row: Record<string, unknown>,
  ...keys: string[]
): string {
  for (const key of keys) {
    const value = row[key];
    if (value != null && String(value).trim()) {
      return String(value).trim();
    }
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
        Name: readString(row.Name),
        ContactNumber: readTenantField(
          row,
          "Contact Number",
          "ContactNumber",
        ),
        EmailAddress: readTenantField(row, "Email Address", "EmailAddress"),
        EmergencyContact: readTenantField(
          row,
          "Emergency Contact",
          "EmergencyContact",
        ),
        EmergencyNumber: readTenantField(
          row,
          "Emergency Number",
          "EmergencyNumber",
        ),
        LeaseStart: readTenantField(row, "Lease Start", "LeaseStart"),
        MoveIn: readString(row.MoveIn),
        Rent: readNumber(row.Rent),
        Deposit: readNumber(row.Deposit),
        Notes: readString(row.Notes),
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
      ContactNumber: "09 12 345 6789",
      EmailAddress: "Joel@gmail.com",
      EmergencyContact: "Joel",
      EmergencyNumber: "09 12 345 6789",
      LeaseStart: "2025-08-30",
      MoveIn: "2025-08-30",
      Rent: 10000,
      Deposit: 10000,
      Notes: "",
      Status: "Active",
    },
    {
      UnitCode: "APT-102",
      Room: 2,
      Name: "Carol",
      ContactNumber: "09 12 345 6789",
      EmailAddress: "carol@gmail.com",
      EmergencyContact: "Carol",
      EmergencyNumber: "09 12 345 6789",
      LeaseStart: "2025-08-30",
      MoveIn: "2025-08-30",
      Rent: 4000,
      Deposit: 4000,
      Notes: "",
      Status: "Active",
    },
    {
      UnitCode: "APT-103",
      Room: 3,
      Name: "Toyota",
      ContactNumber: "",
      EmailAddress: "",
      EmergencyContact: "",
      EmergencyNumber: "",
      LeaseStart: "2025-08-30",
      MoveIn: "2025-08-30",
      Rent: 8000,
      Deposit: 8000,
      Notes: "",
      Status: "Active",
    },
    {
      UnitCode: "APT-104",
      Room: 4,
      Name: "John Wayne Capili",
      ContactNumber: "",
      EmailAddress: "",
      EmergencyContact: "",
      EmergencyNumber: "",
      LeaseStart: "2025-08-30",
      MoveIn: "2025-08-30",
      Rent: 5000,
      Deposit: 5000,
      Notes: "",
      Status: "Active",
    },
    {
      UnitCode: "",
      Room: 5,
      Name: "",
      ContactNumber: "",
      EmailAddress: "",
      EmergencyContact: "",
      EmergencyNumber: "",
      LeaseStart: "",
      MoveIn: "",
      Rent: 0,
      Deposit: 0,
      Notes: "",
      Status: "Vacant",
    },
    {
      UnitCode: "COM-201",
      Room: 7,
      Name: "Service Center",
      ContactNumber: "",
      EmailAddress: "",
      EmergencyContact: "",
      EmergencyNumber: "",
      LeaseStart: "2025-08-30",
      MoveIn: "2025-08-30",
      Rent: 10000,
      Deposit: 10000,
      Notes: "",
      Status: "Active",
    },
    {
      UnitCode: "COM-202",
      Room: 8,
      Name: "Laundry",
      ContactNumber: "",
      EmailAddress: "",
      EmergencyContact: "",
      EmergencyNumber: "",
      LeaseStart: "2025-08-30",
      MoveIn: "2025-08-30",
      Rent: 8000,
      Deposit: 8000,
      Notes: "",
      Status: "Active",
    },
  ];
}

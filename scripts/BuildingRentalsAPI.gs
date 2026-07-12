/**
 * BUILDING RENTALS API — Google Apps Script
 * Copy this entire file into your Apps Script project (Code.gs).
 *
 * Sheet tabs expected:
 *   Tenants_DB  — Unit Code | Room | Name | Contact Number | Email Address |
 *                 Emergency Contact | Emergency Number | Lease Start | MoveIn |
 *                 Rent | Deposit | Notes | Status
 *   Billing_DB  — Month | Room | Rent | ElecPrev | ElecCurr | ElecRate | ElecBill |
 *                 WaterPrev | WaterCurr | WaterRate | WaterBill | Adjustment |
 *                 TotalDue | Paid | DatePaid | Status
 *   Expenses_DB — Date | Category | Description | Amount
 *
 * Deploy: Web app → Execute as Me → Anyone → copy deployment URL to
 *         NEXT_PUBLIC_SHEETS_API_URL in your Next.js .env.local
 */

// ==========================================================================
// 1. INITIALIZATION: Setup Database Schema
// ==========================================================================
function initializeDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const tables = {
    Tenants_DB: [
      "Unit Code",
      "Room",
      "Name",
      "Contact Number",
      "Email Address",
      "Emergency Contact",
      "Emergency Number",
      "Lease Start",
      "MoveIn",
      "Rent",
      "Deposit",
      "Notes",
      "Status",
    ],
    Billing_DB: [
      "Month",
      "Room",
      "Rent",
      "ElecPrev",
      "ElecCurr",
      "ElecRate",
      "ElecBill",
      "WaterPrev",
      "WaterCurr",
      "WaterRate",
      "WaterBill",
      "Adjustment",
      "TotalDue",
      "Paid",
      "DatePaid",
      "Status",
    ],
    Expenses_DB: ["Date", "Category", "Description", "Amount"],
  };

  for (const name in tables) {
    const headers = tables[name];
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else if (name === "Tenants_DB") {
      ensureSheetHeaders(sheet, headers);
    }
  }

  SpreadsheetApp.getUi().alert("Database Schema Validated & Initialized!");
}

function ensureSheetHeaders(sheet, expectedHeaders) {
  const current = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(function (value) {
      return String(value || "").trim();
    });

  expectedHeaders.forEach(function (header, index) {
    if (current[index] !== header) {
      sheet.getRange(1, index + 1).setValue(header);
    }
  });
}

// ==========================================================================
// 2. GET API: Sends data arrays to the React frontend
// ==========================================================================
function doGet(e) {
  if (!e || !e.parameter || !e.parameter.action) {
    return ContentService.createTextOutput(
      "API Active. Provide an ?action parameter.",
    ).setMimeType(ContentService.MimeType.TEXT);
  }

  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet;

  if (action === "getBilling") {
    sheet = ss.getSheetByName("Billing_DB");
  } else if (action === "getTenants") {
    sheet = ss.getSheetByName("Tenants_DB");
  } else if (action === "getExpenses") {
    sheet = ss.getSheetByName("Expenses_DB");
  } else {
    return jsonResponse({ error: "Invalid GET action payload" });
  }

  if (!sheet) {
    return jsonResponse({ error: action + " sheet destination layout missing" });
  }

  let jsonData = sheetToJson(sheet);

  if (action === "getBilling" && e.parameter.month) {
    const targetKey = billingMonthKey(e.parameter.month);
    jsonData = jsonData.filter(function (row) {
      return billingMonthKey(String(row.Month || "")) === targetKey;
    });
  }

  return jsonResponse(jsonData);
}

// ==========================================================================
// 3. POST API: Receives and commits payloads from React
// ==========================================================================
function doPost(e) {
  let response = {};

  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    if (action === "saveTenant") {
      response = saveNewTenant(body.data);
    } else if (action === "deleteTenant") {
      response = deleteTenantRecord(body.data || { room: body.room });
    } else if (action === "generateBill") {
      response = saveGeneratedBill(body.data);
    } else if (action === "updateBill") {
      response = updateExistingBill(body.data);
    } else if (action === "processPayment") {
      response = processPayment(
        body.month,
        body.room,
        body.amount,
        body.date,
      );
    } else if (action === "saveExpense") {
      response = saveNewExpense(body.data);
    } else {
      response = {
        success: false,
        message: "Invalid payload execution action",
      };
    }
  } catch (err) {
    response = { success: false, message: err.message };
  }

  return jsonResponse(response);
}

// ==========================================================================
// 4. HELPERS
// ==========================================================================
function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function sheetToJson(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0];
  const rows = values.slice(1);

  return rows
    .filter(function (row) {
      return row.some(function (cell) {
        return cell !== "" && cell != null;
      });
    })
    .map(function (row) {
      const obj = {};
      headers.forEach(function (header, index) {
        obj[header] = row[index] !== "" ? row[index] : null;
      });
      return obj;
    });
}

function billingMonthKey(month) {
  if (!month) return "";

  const direct = new Date(month);
  if (!isNaN(direct.getTime())) {
    return (
      direct.getFullYear() +
      "-" +
      String(direct.getMonth() + 1).padStart(2, "0")
    );
  }

  const withDay = new Date(String(month) + " 1");
  if (!isNaN(withDay.getTime())) {
    return (
      withDay.getFullYear() +
      "-" +
      String(withDay.getMonth() + 1).padStart(2, "0")
    );
  }

  return String(month);
}

function findBillingRowIndex(sheet, month, room) {
  const values = sheet.getDataRange().getValues();
  const targetMonth = billingMonthKey(month);
  const targetRoom = String(room);

  for (let i = 1; i < values.length; i++) {
    const rowMonth = billingMonthKey(String(values[i][0]));
    const rowRoom = String(values[i][1]);
    if (rowMonth === targetMonth && rowRoom === targetRoom) {
      return i + 1;
    }
  }

  return -1;
}

// ==========================================================================
// 5. TENANTS MODULE
// ==========================================================================

var TENANT_COLUMN_COUNT = 13;
var TENANT_STATUS_COL = 12;

function tenantStatusFromRow(row) {
  return String(row[TENANT_STATUS_COL] || "")
    .trim()
    .toLowerCase();
}

function tenantHasName(row) {
  return String(row[2] || "").trim() !== "";
}

function buildActiveTenantRow(data, existingRow) {
  existingRow = existingRow || [];
  return [
    data.unitCode || existingRow[0] || "",
    data.room != null ? data.room : existingRow[1],
    data.name != null ? data.name : existingRow[2] || "",
    data.contactNumber || data.contact || existingRow[3] || "",
    data.emailAddress || data.email || existingRow[4] || "",
    data.emergencyContact || existingRow[5] || "",
    data.emergencyNumber || existingRow[6] || "",
    data.leaseStart || existingRow[7] || "",
    data.moveIn || existingRow[8] || "",
    Number(data.rent != null ? data.rent : existingRow[9]) || 0,
    Number(data.deposit != null ? data.deposit : existingRow[10]) || 0,
    data.notes != null ? data.notes : existingRow[11] || "",
    data.status || data.Status || "Active",
  ];
}

function buildVacantTenantRow(data, existingRow) {
  return [
    data.unitCode || existingRow[0] || "",
    existingRow[1],
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    0,
    0,
    "",
    "Vacant",
  ];
}

/**
 * Assigns a tenant to an existing vacant row, updates an active profile,
 * or vacates a room. Does NOT append duplicates when a vacant slot exists.
 */
function saveNewTenant(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Tenants_DB");
  if (!sheet) {
    return { success: false, message: "Tenants_DB sheet not found." };
  }

  const values = sheet.getDataRange().getValues();
  const room = String(data.room);
  const requestedStatus = String(data.status || data.Status || "Active")
    .trim()
    .toLowerCase();
  const isVacate =
    requestedStatus === "vacant" || !String(data.name || "").trim();

  let vacantRowIndex = -1;
  let activeRowIndex = -1;

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][1]) !== room) continue;

    const rowStatus = tenantStatusFromRow(values[i]);
    const hasName = tenantHasName(values[i]);

    if (rowStatus === "vacant" && !hasName) {
      vacantRowIndex = i;
    } else {
      activeRowIndex = i;
    }
  }

  if (isVacate) {
    if (activeRowIndex < 0) {
      return {
        success: false,
        message: "Active tenant for this room was not found.",
      };
    }
    sheet
      .getRange(activeRowIndex + 1, 1, 1, TENANT_COLUMN_COUNT)
      .setValues([
        buildVacantTenantRow(data, values[activeRowIndex]),
      ]);
    return { success: true, message: "Room set to Vacant." };
  }

  if (vacantRowIndex >= 0) {
    sheet
      .getRange(vacantRowIndex + 1, 1, 1, TENANT_COLUMN_COUNT)
      .setValues([buildActiveTenantRow(data, values[vacantRowIndex])]);
    return { success: true, message: "Tenant assigned to vacant room." };
  }

  if (activeRowIndex >= 0) {
    sheet
      .getRange(activeRowIndex + 1, 1, 1, TENANT_COLUMN_COUNT)
      .setValues([buildActiveTenantRow(data, values[activeRowIndex])]);
    return { success: true, message: "Tenant profile updated." };
  }

  sheet.appendRow(buildActiveTenantRow(data, []));
  return {
    success: true,
    message: "Tenant committed successfully to database.",
  };
}

/** Clears tenant fields and sets Status back to Vacant (does not delete the row). */
function deleteTenantRecord(data) {
  const payload =
    data && typeof data === "object" ? data : { room: data };

  return saveNewTenant({
    room: payload.room,
    unitCode: payload.unitCode || "",
    name: "",
    rent: 0,
    moveIn: "",
    deposit: 0,
    status: "Vacant",
  });
}

// ==========================================================================
// 6. BILLING MODULE
// ==========================================================================
function saveGeneratedBill(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const db = ss.getSheetByName("Billing_DB");
  if (!db) {
    return { success: false, message: "Billing_DB sheet not found." };
  }

  if (findBillingRowIndex(db, data.month, data.room) > 0) {
    return {
      success: false,
      message: "A bill already exists for this room and month.",
    };
  }

  const eCons = Number(data.eCurr) - Number(data.ePrev);
  const wCons = Number(data.wCurr) - Number(data.wPrev);
  const eBill = eCons * Number(data.eRate);
  const wBill = wCons * Number(data.wRate);
  const totalDue =
    Number(data.rent) + eBill + wBill + Number(data.adjustment || 0);

  db.appendRow([
    data.month,
    data.room,
    data.rent,
    data.ePrev,
    data.eCurr,
    data.eRate,
    eBill,
    data.wPrev,
    data.wCurr,
    data.wRate,
    wBill,
    data.adjustment || 0,
    totalDue,
    0,
    "",
    "Unpaid",
  ]);

  return { success: true, message: "Calculated invoice generated and logged." };
}

function updateExistingBill(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Billing_DB");
  if (!sheet) {
    return { success: false, message: "Billing_DB sheet not found." };
  }

  const rowIndex = findBillingRowIndex(sheet, data.month, data.room);
  if (rowIndex < 0) {
    return {
      success: false,
      message: "Billing record not found for this month and room.",
    };
  }

  const totalDue =
    Number(data.rent) +
    Number(data.eBill) +
    Number(data.wBill) +
    Number(data.adjustment || 0);

  sheet.getRange(rowIndex, 1, 1, 16).setValues([
    [
      data.month,
      data.room,
      Number(data.rent) || 0,
      Number(data.ePrev) || 0,
      Number(data.eCurr) || 0,
      Number(data.eRate) || 0,
      Number(data.eBill) || 0,
      Number(data.wPrev) || 0,
      Number(data.wCurr) || 0,
      Number(data.wRate) || 0,
      Number(data.wBill) || 0,
      Number(data.adjustment) || 0,
      totalDue,
      Number(data.paid) || 0,
      data.datePaid || sheet.getRange(rowIndex, 15).getValue() || "",
      data.status || "Unpaid",
    ],
  ]);

  return { success: true, message: "Billing record updated." };
}

function processPayment(month, room, amount, datePaid) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Billing_DB");
  if (!sheet) {
    return { success: false, message: "Billing_DB sheet not found." };
  }

  const rowIndex = findBillingRowIndex(sheet, month, room);
  if (rowIndex < 0) {
    return {
      success: false,
      message: "Target ledger month range or unit block map not found.",
    };
  }

  const totalDue = Number(sheet.getRange(rowIndex, 13).getValue()) || 0;
  const paidAmount = Number(amount) || 0;
  const status = paidAmount >= totalDue ? "Paid" : "Partial";
  const actualDate = datePaid || new Date().toLocaleDateString("en-US");

  sheet.getRange(rowIndex, 14).setValue(paidAmount);
  sheet.getRange(rowIndex, 15).setValue(actualDate);
  sheet.getRange(rowIndex, 16).setValue(status);

  return { success: true, message: "Transaction completed." };
}

// ==========================================================================
// 7. EXPENSES MODULE
// ==========================================================================
function saveNewExpense(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const db = ss.getSheetByName("Expenses_DB");
  if (!db) {
    return { success: false, message: "Expenses_DB sheet not found." };
  }

  db.appendRow([
    data.date || new Date().toLocaleDateString("en-US"),
    data.category,
    data.description,
    Number(data.amount),
  ]);

  return { success: true, message: "Expense logged successfully to ledger." };
}

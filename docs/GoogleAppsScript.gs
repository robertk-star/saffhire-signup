/**
 * SaffHire Intake Form - Google Apps Script
 * ==========================================
 * Deploy this as a Web App (Execute as: Me, Who has access: Anyone).
 *
 * Supports two actions sent in the POST body:
 *   action: "upsert"  - find the row whose sessionId matches and update it
 *                       in-place, or append a new row if no match is found.
 *                       Used for real-time partial saves during form fill.
 *   action: "append"  - always append a new row.
 *                       Used for the final completed submission.
 *   (omitted)         - treated as "append" for backwards compatibility.
 *
 * Sheet column order (Row 1 must contain these exact headers):
 *   A: sessionId      B: status         C: submittedAt
 *   D: companyName    E: ein            F: businessEntity
 *   G: ownerFirstName H: ownerLastName  I: ownerEmail
 *   J: ownerPhone     K: ownerTitle     L: contactFirstName
 *   M: contactLastName N: contactEmail  O: contactPhone
 *   P: contactTitle   Q: businessStreet R: businessCity
 *   S: businessState  T: businessZip    U: billingSameAsBusiness
 *   V: billingStreet  W: billingCity    X: billingState
 *   Y: billingZip     Z: adminUsers
 */

var SHEET_NAME = "Intakes"; // Change to your actual sheet tab name
var NOTIFICATION_EMAIL = "robertk@saffhire.com";

// Column order - must match the sheet headers exactly
var COLUMNS = [
  "sessionId", "status", "submittedAt",
  "companyName", "ein", "businessEntity",
  "ownerFirstName", "ownerLastName", "ownerEmail", "ownerPhone", "ownerTitle",
  "contactFirstName", "contactLastName", "contactEmail", "contactPhone", "contactTitle",
  "businessStreet", "businessCity", "businessState", "businessZip",
  "billingSameAsBusiness", "billingStreet", "billingCity", "billingState", "billingZip",
  "adminUsers"
];

/**
 * Entry point for POST requests from the intake form server.
 */
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action || "append";
    var sessionId = payload.sessionId || "";

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      // Create the sheet with headers if it does not exist
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(COLUMNS);
    }

    // Ensure header row exists
    ensureHeaders(sheet);

    if (action === "upsert" && sessionId) {
      upsertRow(sheet, sessionId, payload);
    } else {
      appendRow(sheet, payload);
      // Send notification email only on final completed submissions
      if (payload.status === "Completed") {
        sendNotificationEmail(payload);
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Find the row with a matching sessionId and update it in-place.
 * If no match is found, append a new row.
 */
function upsertRow(sheet, sessionId, payload) {
  var data = sheet.getDataRange().getValues();
  var headers = data[0]; // Row 1 = headers
  var sessionIdCol = headers.indexOf("sessionId");

  if (sessionIdCol === -1) {
    // No sessionId column found - fall back to append
    appendRow(sheet, payload);
    return;
  }

  // Search for existing row (start from index 1 to skip headers)
  var existingRowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][sessionIdCol] === sessionId) {
      existingRowIndex = i + 1; // Sheets rows are 1-indexed; data array is 0-indexed
      break;
    }
  }

  if (existingRowIndex > 0) {
    // Update only cells that have new non-empty values - preserve existing data
    for (var c = 0; c < COLUMNS.length; c++) {
      var colName = COLUMNS[c];
      var newValue = payload[colName];
      if (newValue !== undefined && newValue !== null && newValue !== "") {
        sheet.getRange(existingRowIndex, c + 1).setValue(newValue);
      }
    }
  } else {
    // No existing row - append a new one
    appendRow(sheet, payload);
  }
}

/**
 * Append a new row to the sheet.
 */
function appendRow(sheet, payload) {
  var row = COLUMNS.map(function(col) {
    var val = payload[col];
    return (val !== undefined && val !== null) ? val : "";
  });
  sheet.appendRow(row);
}

/**
 * Ensure the first row contains the correct headers.
 * If the sheet is empty, write the headers.
 */
function ensureHeaders(sheet) {
  var firstRow = sheet.getRange(1, 1, 1, COLUMNS.length).getValues()[0];
  var hasHeaders = firstRow[0] === "sessionId";
  if (!hasHeaders) {
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]);
  }
}

/**
 * Send a notification email to the owner when a completed intake is submitted.
 */
function sendNotificationEmail(payload) {
  try {
    var subject = "New SaffHire Account Setup - " + (payload.companyName || "Unknown Company");
    var body = [
      "A new account setup intake has been completed.",
      "",
      "Company: " + (payload.companyName || "-"),
      "Owner: " + (payload.ownerFirstName || "") + " " + (payload.ownerLastName || ""),
      "Email: " + (payload.ownerEmail || "-"),
      "Phone: " + (payload.ownerPhone || "-"),
      "EIN: " + (payload.ein || "-"),
      "Entity Type: " + (payload.businessEntity || "-"),
      "",
      "Business Address:",
      (payload.businessStreet || "-") + ", " +
        (payload.businessCity || "") + ", " +
        (payload.businessState || "") + " " +
        (payload.businessZip || ""),
      "",
      "Submitted: " + (payload.submittedAt || new Date().toISOString()),
      "",
      "View all submissions in the SaffHire Intakes spreadsheet."
    ].join("\n");

    MailApp.sendEmail(NOTIFICATION_EMAIL, subject, body);
  } catch (emailErr) {
    Logger.log("Email notification failed: " + emailErr.message);
  }
}

/**
 * Handle GET requests (for testing the deployment URL in a browser).
 */
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "SaffHire Apps Script is running." }))
    .setMimeType(ContentService.MimeType.JSON);
}

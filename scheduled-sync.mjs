/**
 * Scheduled task: Sync completed SaffHire intake submissions from MySQL to Google Sheets.
 * 
 * This task runs hourly and:
 * 1. Queries the MySQL database for all submissions with status="Completed" and synced=false
 * 2. For each new submission, appends a row to Google Sheets
 * 3. Marks the submission as synced in the database
 * 
 * Environment variables (auto-injected):
 * - DATABASE_URL: MySQL connection string
 * - VITE_GOOGLE_APPS_SCRIPT_URL: Google Apps Script Web App URL
 */

import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
const APPS_SCRIPT_URL = process.env.VITE_GOOGLE_APPS_SCRIPT_URL;

if (!DATABASE_URL) {
  console.error("[Sync] DATABASE_URL not configured");
  process.exit(1);
}

if (!APPS_SCRIPT_URL) {
  console.error("[Sync] VITE_GOOGLE_APPS_SCRIPT_URL not configured");
  process.exit(1);
}

async function syncToGoogleSheets() {
  let connection;
  try {
    // Parse connection string
    const url = new URL(DATABASE_URL);
    const config = {
      host: url.hostname,
      port: url.port || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      ssl: url.searchParams.get("ssl") === "true" ? "Amazon RDS" : undefined,
    };

    connection = await mysql.createConnection(config);
    console.log("[Sync] Connected to MySQL");

    // Query unsynced completed submissions
    const [rows] = await connection.execute(
      `SELECT * FROM signupIntakes WHERE status = 'Completed' AND synced = false ORDER BY createdAt ASC LIMIT 100`
    );

    if (rows.length === 0) {
      console.log("[Sync] No new submissions to sync");
      await connection.end();
      return;
    }

    console.log(`[Sync] Found ${rows.length} new submissions to sync`);

    // Sync each row to Google Sheets
    for (const row of rows) {
      try {
        const payload = {
          action: "append",
          status: "Completed",
          sessionId: row.sessionId,
          companyName: row.companyName,
          ein: row.ein,
          businessEntity: row.businessEntity,
          ownerFirstName: row.ownerFirstName,
          ownerLastName: row.ownerLastName,
          ownerEmail: row.ownerEmail,
          ownerPhone: row.ownerPhone,
          ownerTitle: row.ownerTitle,
          contactFirstName: row.contactFirstName,
          contactLastName: row.contactLastName,
          contactEmail: row.contactEmail,
          contactPhone: row.contactPhone,
          contactTitle: row.contactTitle,
          businessStreet: row.businessStreet,
          businessCity: row.businessCity,
          businessState: row.businessState,
          businessZip: row.businessZip,
          billingSameAsBusiness: row.billingSameAsBusiness,
          billingStreet: row.billingStreet,
          billingCity: row.billingCity,
          billingState: row.billingState,
          billingZip: row.billingZip,
          adminUsers: row.adminUsers,
          submittedAt: row.submittedAt ? row.submittedAt.toISOString() : new Date().toISOString(),
        };

        // POST to Apps Script with manual redirect handling
        const postResponse = await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          redirect: "manual",
        });

        let finalResponse;
        if (postResponse.status === 302 || postResponse.status === 301) {
          const redirectUrl = postResponse.headers.get("location");
          if (redirectUrl) {
            finalResponse = await fetch(redirectUrl, { method: "GET" });
          } else {
            throw new Error("Redirect without Location header");
          }
        } else {
          finalResponse = postResponse;
        }

        if (!finalResponse.ok) {
          throw new Error(`Apps Script returned ${finalResponse.status}`);
        }

        const result = await finalResponse.json();
        if (!result.success) {
          throw new Error(`Apps Script error: ${result.error || "unknown"}`);
        }

        // Mark as synced in database
        await connection.execute(
          `UPDATE signupIntakes SET synced = true, syncedAt = NOW() WHERE id = ?`,
          [row.id]
        );

        console.log(`[Sync] Synced submission ID ${row.id} (${row.companyName})`);
      } catch (err) {
        console.error(`[Sync] Failed to sync submission ID ${row.id}:`, err.message);
        // Continue with next row instead of failing the entire sync
      }
    }

    console.log("[Sync] Sync completed");
    await connection.end();
  } catch (err) {
    console.error("[Sync] Fatal error:", err);
    if (connection) await connection.end();
    process.exit(1);
  }
}

// Run the sync
syncToGoogleSheets();

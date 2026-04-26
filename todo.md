# SaffHire Signup — TODO

## Core Features
- [x] Database schema: `signupIntakes` table in drizzle/schema.ts
- [x] Push DB migration with pnpm db:push
- [x] Server router: tRPC procedures for getNextMessage, extractFieldValue, submitIntake
- [x] Claude AI questionnaire logic (claudeQuestionnaire.ts) — system prompt + section guidance
- [x] Google Sheets integration helper (googleSheets.ts)
- [x] GoHighLevel CRM integration helper (gohighlevel.ts)
- [x] notifyOwner call on intake completion
- [x] Full intake form UI (AccountSetup.tsx) — conversational chat interface
- [x] Progress indicator showing current step / total steps
- [x] All 5 sections: Company Info, Contact Details, Address, Billing, Admin Users
- [x] Input validation with inline error messages (email, phone, required fields)
- [x] Review & Confirm screen before final submission
- [x] Success confirmation screen with next-steps messaging
- [x] No navbar or footer — full-screen distraction-free experience
- [x] Elegant premium visual design (refined typography, generous spacing, polished components)
- [x] Wire App.tsx so AccountSetup is the homepage (/)
- [x] Configure secrets: ANTHROPIC_API_KEY, VITE_GOOGLE_APPS_SCRIPT_URL, GOHIGHLEVEL_API_KEY_TEMP, GOHIGHLEVEL_LOCATION_ID, GOHIGHLEVEL_NOTIFICATION_EMAIL
- [x] Vitest tests for submitIntake procedure (8 tests, all passing)
- [x] Final checkpoint and delivery

## Real-time Progress Logging
- [x] Add saveProgress tRPC procedure — upserts partial intake row to DB and logs to Google Sheets
- [x] Assign a stable sessionId on page load so repeated saves update the same row (no duplicates)
- [x] Call saveProgress from frontend after each AI exchange + after data extraction completes
- [x] Google Sheets: use sessionId as a row key so partial rows are updated in-place, not duplicated
- [x] Update vitest tests to cover saveProgress procedure (13 tests total, all passing)

## Apps Script Upsert + Admin Dashboard
- [x] Write updated Google Apps Script with upsert-by-sessionId logic
- [x] Build /admin route with protected dashboard showing all submissions
- [x] Admin dashboard: table of In Progress + Completed rows, sortable by date
- [x] Admin dashboard: owner-only access (role check)
- [x] Add admin server-side procedure to list all intakes
- [x] Run tests and save checkpoint (15 tests, all passing)
- [x] Guide user to publish


## Scheduled Google Sheets Sync (Hourly)
- [x] Remove real-time logToGoogleSheets calls from form submission procedures
- [x] Add synced and syncedAt columns to signupIntakes table schema
- [x] Create scheduled-sync.mjs task that queries MySQL for unsynced Completed submissions
- [x] Scheduled task posts each submission to Google Sheets via Apps Script
- [x] Scheduled task marks submissions as synced in database after successful post
- [x] Update vitest tests to reflect new sync approach (14 tests passing, 0 failures)


## Hourly Scheduled Sync + Admin Dashboard Enhancements

- [x] Create 6-hourly scheduled task (saffhire-sheets-sync) via schedule tool
- [x] Add manualSyncToSheets admin-only tRPC procedure
- [x] Add synced and syncedAt columns to IntakeRow type in Admin.tsx
- [x] Add "Sheets Sync" column to admin dashboard table showing Synced/Pending status
- [x] Add "Sync Now" button in admin header for manual on-demand sync
- [x] Wire up handleManualSync mutation with loading state
- [x] All 14 tests passing, zero TypeScript errors


## Form Redesign - Static Multi-Step Form (from ClientCredentialing PDF)

- [x] Remove Claude questionnaire logic and replace with static form structure
- [x] Build multi-step form matching PDF: Client Info → Contact Info → Business Address → Billing Address → Admin Users → Signature
- [x] Add form validation with inline error messages (email, phone, required fields)
- [x] Add progress indicator showing current step
- [x] Build review screen showing all collected data
- [x] Wire up form submission to database, Google Sheets, GoHighLevel, and owner notification
- [x] Update tests for new form structure (14 tests passing)
- [x] Publish and test end-to-end


## Dynamic Admin Users Flow

- [x] Update Admin Users step to start with Primary Admin questions only
- [x] After Primary Admin, ask "Add another user?" with Yes/No
- [x] If Yes, ask access level (Admin vs General Access)
- [x] Show User 2 questions based on access level
- [x] After User 2, ask "Add a third user?" with Yes/No
- [x] If Yes, ask access level for User 3
- [x] Show User 3 questions
- [x] Update form data structure to track access levels
- [x] Update review screen to show all users with their access levels
- [x] Test end-to-end flow with 1, 2, and 3 users (14 tests passing)
- [x] Save checkpoint and publish


## Admin Fields Refactor (Database Schema)

- [x] Migrate adminUsers JSON blob to individual admin1/admin2/admin3 fields in database schema
- [x] Update server router to map form data to individual admin fields
- [x] Update Admin.tsx IntakeRow type to use individual admin fields
- [x] Update IntakeDetailModal to display individual admin fields instead of parsing JSON
- [x] Verify all tests pass (14 tests passing)
- [x] TypeScript compilation successful

## SaffHire Logo Display

- [x] Remove client logo upload feature from form
- [x] Remove companyLogoUrl from FormData interface
- [x] Remove CompanyLogoUpload component
- [x] Remove logo display from ReviewScreen
- [x] Upload SaffHire logo to storage
- [x] Update header to display SaffHire logo in top-left
- [x] All 17 tests passing, zero TypeScript errors
- [x] SaffHire logo now displays properly in form header

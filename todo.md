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

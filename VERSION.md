# Meat Uploaded v2.1.0

Production-hardening release.

## Fixed
- Telegram scheduler now uses the post's persisted `scheduledTime`.
- Scheduler runs every 5 minutes and sends overdue same-day posts instead of requiring an exact minute match.
- Firestore transaction claim prevents duplicate sends from overlapping scheduler executions.
- Failed Telegram sends return the post to `scheduled` with error/retry metadata.
- Stale `sending` claims are recoverable after `SCHEDULER_STALE_MINUTES`.
- Backend Super Admin endpoints now require an active `admins/{uid}` document with `role: "super_admin"`.
- Firestore client rules no longer grant access to every authenticated Firebase user.
- CORS can be restricted with `ALLOWED_ORIGINS`.
- Telegram HTTP calls have a 15-second timeout.
- Telegram callback completion is idempotent for already-completed posts.
- Added `scripts/bootstrap-admin.mjs` and `npm run bootstrap-admin`.

## Important deployment note
The web service and cron service are separate Render services. Both must have the Firebase Admin and Telegram environment variables they need.

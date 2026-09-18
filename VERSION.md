# Meat Uploaded v2.1.0

Updated September 2026.

## Changes
- Telegram reminder schedules are now stored separately per entity.
- Each entity has an independent Monday-Sunday schedule.
- Post scheduling automatically uses the selected entity's weekday/time.
- Server scheduler sends each entity's due posts independently.
- Telegram messages include the entity-specific reminder time.
- Calendar detects missing uploads for scheduled entities.
- Render Blueprint includes a 5-minute scheduler Cron Job.
- Telegram bot token remains server-side in Render environment variables.

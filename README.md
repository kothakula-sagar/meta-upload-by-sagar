# Meat Uploaded v2

A minimal content-control SaaS for one Super Admin.

## Stack

- React + Vite + Tailwind CSS
- Firebase Authentication + Firestore
- Cloudinary image uploads
- Node.js + Express `server.js`
- Telegram Bot API
- GitHub + Render

Instagram publishing is manual. Telegram only sends the reminder and the DONE confirmation.

## What changed in v2

This version uses the same practical architecture as the Abra CRM pattern: a Node.js `server.js` backend on Render instead of Firebase Cloud Functions. This avoids the Firebase Blaze/Secret Manager dependency for Telegram.

### Backend responsibilities

- Verify Firebase login tokens for protected API requests
- Send Telegram test messages
- Receive Telegram webhook callbacks
- Mark a post `completed` after the Telegram DONE button
- Run the scheduled reminder checker
- Serve the built React app in production

## Environment variables

Copy `.env.example` to `.env` locally.

```text
copy .env.example .env
```

Never commit `.env` or a Firebase service-account JSON file.

Render supports adding environment variables from a `.env` file through its dashboard. urlRender environment variableshttps://render.com/docs/configure-environment-variables

### Frontend variables

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=meta-upload-b46c8.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=meta-upload-b46c8
VITE_FIREBASE_STORAGE_BUCKET=meta-upload-b46c8.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=740698572142
VITE_FIREBASE_APP_ID=...

VITE_CLOUDINARY_CLOUD_NAME=nagb8qtj
VITE_CLOUDINARY_UPLOAD_PRESET=meta-upload
VITE_CLOUDINARY_FOLDER=meta-upload
```

Vite exposes `VITE_*` values to browser code, so **never** put the Telegram bot token or Firebase Admin private key in a `VITE_*` variable.

### Server variables

```env
PORT=3000
APP_TIMEZONE=Asia/Kolkata
TELEGRAM_BOT_TOKEN=...
TELEGRAM_WEBHOOK_SECRET=...
CRON_SECRET=...
FIREBASE_PROJECT_ID=meta-upload-b46c8
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

The Firebase Admin SDK is used only by `server.js`. Firebase documents service-account credentials for trusted server environments. urlFirebase Admin SDK setuphttps://firebase.google.com/docs/admin/setup

## Local development

Terminal 1:

```bash
npm install
npm run server
```

Terminal 2:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

Vite proxies `/api` to `http://localhost:3000`.

## Telegram setup

1. Create the bot with BotFather.
2. Put the BotFather token in `TELEGRAM_BOT_TOKEN`.
3. Open the Telegram page in Meat Uploaded.
4. Save the Chat ID.
5. Click **Send test**.

The test endpoint requires a valid Firebase Authentication ID token, then the server reads the saved Chat ID from Firestore and calls Telegram.

### Webhook

After deploying to Render, set `PUBLIC_BASE_URL` to your Render URL, for example:

```text
https://meat-uploaded.onrender.com
```

On startup, `server.js` automatically calls Telegram `setWebhook` and configures:

```text
https://YOUR-RENDER-DOMAIN/api/telegram/webhook
```

The webhook uses `TELEGRAM_WEBHOOK_SECRET` when configured and accepts callback-query updates for the Telegram DONE button. Telegram webhooks deliver HTTPS POST updates to your endpoint. urlTelegram Bot APIhttps://core.telegram.org/bots/api

You therefore do not need to manually call `setWebhook` after every deployment.

Do not put the real token in GitHub, README, or frontend code.

## Scheduled reminders

The server has a one-shot scheduler command:

```bash
npm run scheduler
```

It checks the configured weekday/time in `Asia/Kolkata`, finds today's posts with `status = scheduled`, sends Telegram reminders, and changes them to `pending`.

The Telegram DONE button changes the post to `completed`.

### Render options

For testing, the Node web service can run the scheduler in-process if you set your own interval mechanism.

For reliable production scheduling, create a Render Cron Job that runs:

```text
npm run scheduler
```

at a suitable UTC interval, such as every 5 minutes:

```text
*/5 * * * *
```

The scheduler itself uses `Asia/Kolkata`, so the configured Settings time is interpreted as India time. Render cron schedules are UTC. Render cron jobs are billed by active runtime and have a minimum monthly charge. urlRender Cron Jobshttps://render.com/docs/cronjobs

Free Render web services can spin down after inactivity, so relying only on an in-process timer is not appropriate for dependable scheduled reminders. urlRender free serviceshttps://render.com/docs/free

## Render Web Service

Use:

```text
Build Command: npm install && npm run build
Start Command: npm start
Health Check Path: /api/health
```

The server binds to `0.0.0.0` and the Render `PORT` environment variable. Render requires web services to bind to the public host/port. urlRender Web Serviceshttps://render.com/docs/web-services

The included `render.yaml` provides the web-service configuration and marks sensitive values as `sync: false` so they must be supplied in Render.

## Firestore rules

For the current single-Super-Admin application:

```text
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

For a larger production application, tighten the rules to the intended admin UID/custom claim.

## Project details

- Firebase project: `meta-upload-b46c8`
- Cloudinary cloud: `nagb8qtj`
- Cloudinary preset: `meta-upload`
- Cloudinary folder: `meta-upload`
- Telegram Chat ID is stored in Firestore, not frontend source
- Service is optional when scheduling a post
- If there is exactly one service, it is used automatically
- If there is no service, `General / No specific service` is used
- Reminder time is taken from Settings based on the selected weekday

## Per-entity Telegram scheduling

Telegram reminder times are stored on each entity in the `telegramSchedule` field. Each entity has an independent Monday-Sunday schedule.

Example:

```text
Abra Logistics
  Monday 10:00

Abra Global Shipping
  Monday 14:00
```

A post inherits the selected entity's reminder time for the weekday of its scheduled date. The post form has no separate time input. If the entity's schedule is changed later, the scheduler uses the latest entity schedule when deciding when to send the reminder.

The Telegram message contains the entity, service, reminder time, scheduled date, description, hashtags, Cloudinary image link, and a `DONE — POSTED TO INSTAGRAM` button. Clicking DONE changes the Firestore post status to `completed`.

## Render scheduler

The included `render.yaml` defines two Render services:

- `meat-uploaded`: Node web service serving the React build and API.
- `meat-uploaded-scheduler`: Render Cron Job running `npm run scheduler` every 5 minutes.

Render cron expressions use UTC. The application converts the current time to `Asia/Kolkata` before comparing it with each entity's configured schedule. Render documents cron jobs as a separate service type and notes that cron schedules are UTC. urlRender Cron Jobshttps://render.com/docs/cronjobs

The scheduler is intentionally a one-shot process so each cron run starts, checks all entity schedules, sends due reminders, and exits.

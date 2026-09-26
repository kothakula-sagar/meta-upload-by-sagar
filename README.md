# Meat Uploaded

Private Super Admin content scheduling dashboard for manual Instagram publishing with Telegram reminders.

## Architecture

- React + Vite frontend
- Firebase Authentication + Firestore
- Cloudinary for image hosting
- Node/Express backend on Render
- Separate Render Cron Job every 5 minutes for Telegram reminders

## Production deployment

### 1. Firebase Authentication
Create the Super Admin account in Firebase Authentication and copy its Firebase UID.

### 2. Create the Super Admin authorization record
Use the Firebase Admin SDK from a trusted environment:

```bash
ADMIN_UID=YOUR_FIREBASE_UID npm run bootstrap-admin
```

The command requires:

```text
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

It creates:

```text
admins/{YOUR_FIREBASE_UID}
  role: super_admin
  active: true
```

Do not create this document from the browser.

### 3. Deploy Firestore rules
Deploy `firestore.rules` to the Firebase project before using the production frontend.

### 4. Render Web Service
Required environment variables:

```text
NODE_VERSION=22.19.0
APP_TIMEZONE=Asia/Kolkata
PUBLIC_BASE_URL=https://YOUR-APP.onrender.com
ALLOWED_ORIGINS=https://YOUR-APP.onrender.com
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=meta-upload-b46c8
VITE_FIREBASE_AUTH_DOMAIN=meta-upload-b46c8.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=meta-upload-b46c8.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=740698572142
VITE_FIREBASE_APP_ID=...
VITE_CLOUDINARY_CLOUD_NAME=nagb8qtj
VITE_CLOUDINARY_UPLOAD_PRESET=meta-upload
VITE_CLOUDINARY_FOLDER=meta-upload
TELEGRAM_BOT_TOKEN=...
TELEGRAM_WEBHOOK_SECRET=...
CRON_SECRET=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

### 5. Render Cron Job
The cron service must be a separate Render Cron Job with:

```text
schedule: */5 * * * *
startCommand: npm run scheduler
```

Required environment variables:

```text
NODE_VERSION=22.19.0
APP_TIMEZONE=Asia/Kolkata
TELEGRAM_BOT_TOKEN=...
CRON_SECRET=...
FIREBASE_PROJECT_ID=meta-upload-b46c8
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

### 6. Telegram scheduling behavior
When a post is created, its `scheduledTime` is saved on the post itself.

The scheduler checks:

```text
scheduledDate == today's Asia/Kolkata date
status == scheduled or recoverable sending
current time >= post.scheduledTime
```

It does **not** re-read the entity's current weekly schedule when sending. This prevents later settings changes from moving an already scheduled post.

Example:

```text
Post scheduledTime = 15:00
Cron runs at 15:00 -> send
Cron runs at 15:05 -> send if still scheduled
Cron runs at 15:10 -> no duplicate because status is pending
```

If Telegram fails, the post is restored to `scheduled` so the next cron execution can retry.

### 7. Verify production

Check:

```text
GET /api/health
```

Then use the Telegram page's **Send test** button.

Finally schedule a test post at least 5 minutes in the future and inspect:

```text
Render -> meat-uploaded-scheduler -> Logs
```

Expected log pattern:

```text
[scheduler] ... found 1 candidate post(s)
[scheduler] SENT POST_ID -> Entity at 15:00
Scheduler result: {"sent":1,"skipped":0,"failed":0,...}
```

## Security

- Never put `TELEGRAM_BOT_TOKEN`, `FIREBASE_PRIVATE_KEY`, or other server secrets in `VITE_*` variables.
- Never commit `.env` files.
- Keep the Cloudinary unsigned upload preset restricted to the required image types/size/folder.
- Keep the Firebase Super Admin record server-managed.

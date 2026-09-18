# Meat Uploaded v2.0.0

- Replaced Firebase Cloud Functions Telegram backend with Render-compatible Node/Express `server.js`.
- Added `.env.example`.
- Moved Firebase Web config and Cloudinary config to Vite environment variables.
- Set Cloudinary preset to `meta-upload`.
- Added protected Telegram test endpoint using Firebase Auth ID tokens.
- Added Telegram webhook and DONE callback handling.
- Added scheduler one-shot command for Render Cron Jobs.
- Added Render deployment configuration.
- Removed Firebase Functions dependency from the project.

import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const TZ = process.env.APP_TIMEZONE || "Asia/Kolkata";
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "meta-upload-b46c8";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";
const CRON_SECRET = process.env.CRON_SECRET || "";
const PUBLIC_BASE_URL = String(process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || PUBLIC_BASE_URL)
  .split(",")
  .map(value => value.trim())
  .filter(Boolean);
const SCHEDULER_STALE_MINUTES = Number(process.env.SCHEDULER_STALE_MINUTES || 10);

function required(name, value) {
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function initFirebaseAdmin() {
  if (getApps().length) return getApps()[0];

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("Firebase Admin credentials are missing. Set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.");
  }

  return initializeApp({
    credential: cert({ projectId: PROJECT_ID, clientEmail, privateKey }),
    projectId: PROJECT_ID
  });
}

initFirebaseAdmin();
const db = getFirestore();
const auth = getAuth();

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function telegramRequest(method, body) {
  const token = required("TELEGRAM_BOT_TOKEN", TELEGRAM_BOT_TOKEN);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      throw new Error(data.description || `Telegram API returned HTTP ${response.status}.`);
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function configureTelegramWebhook() {
  if (!PUBLIC_BASE_URL || !TELEGRAM_BOT_TOKEN) {
    console.log("Telegram webhook setup skipped: PUBLIC_BASE_URL or TELEGRAM_BOT_TOKEN is missing.");
    return;
  }

  const webhookUrl = `${PUBLIC_BASE_URL}/api/telegram/webhook`;
  try {
    await telegramRequest("setWebhook", {
      url: webhookUrl,
      ...(TELEGRAM_WEBHOOK_SECRET ? { secret_token: TELEGRAM_WEBHOOK_SECRET } : {}),
      allowed_updates: ["callback_query"]
    });
    console.log(`Telegram webhook configured: ${webhookUrl}`);
  } catch (error) {
    console.error("Telegram webhook setup failed:", error.message);
  }
}

function nowInIndia() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());

  const get = type => parts.find(part => part.type === type)?.value;
  return {
    day: get("weekday").toLowerCase(),
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`
  };
}

function minutesFromHHMM(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

function isDue(scheduledDate, scheduledTime, current) {
  if (scheduledDate !== current.date) return false;
  const scheduledMinutes = minutesFromHHMM(scheduledTime);
  const currentMinutes = minutesFromHHMM(current.time);
  return scheduledMinutes !== null && currentMinutes !== null && currentMinutes >= scheduledMinutes;
}

function getDownloadName(service, entity) {
  return `${service || "General"} of ${entity || "Entity"} by sagar`;
}

async function isSuperAdminUid(uid) {
  if (!uid) return false;
  const snap = await db.doc(`admins/${uid}`).get();
  const data = snap.data() || {};
  return snap.exists && data.active === true && data.role === "super_admin";
}

async function claimPost(postRef, current) {
  const claim = await db.runTransaction(async transaction => {
    const snap = await transaction.get(postRef);
    if (!snap.exists) return false;
    const post = snap.data() || {};

    if (post.status === "scheduled") {
      if (!isDue(post.scheduledDate, post.scheduledTime, current)) return false;
      transaction.update(postRef, {
        status: "sending",
        sendingStartedAt: FieldValue.serverTimestamp(),
        schedulerClaimedAt: FieldValue.serverTimestamp()
      });
      return true;
    }

    if (post.status === "sending" && post.sendingStartedAt?.toMillis) {
      const ageMs = Date.now() - post.sendingStartedAt.toMillis();
      if (ageMs >= SCHEDULER_STALE_MINUTES * 60 * 1000 && isDue(post.scheduledDate, post.scheduledTime, current)) {
        transaction.update(postRef, {
          status: "sending",
          sendingStartedAt: FieldValue.serverTimestamp(),
          schedulerClaimedAt: FieldValue.serverTimestamp(),
          retryCount: FieldValue.increment(1)
        });
        return true;
      }
    }

    return false;
  });
  return claim;
}

async function sendScheduledReminders() {
  const current = nowInIndia();
  const telegramSnap = await db.doc("telegram/primary").get();
  const chatId = String(telegramSnap.data()?.chatId || "");

  if (!chatId) {
    return { sent: 0, skipped: 0, failed: 0, date: current.date, time: current.time, reason: "Telegram chat ID is not configured." };
  }

  // Keep these as two simple queries so Firestore does not require a composite index.
  const [scheduledSnap, sendingSnap] = await Promise.all([
    db.collection("posts").where("scheduledDate", "==", current.date).where("status", "==", "scheduled").get(),
    db.collection("posts").where("scheduledDate", "==", current.date).where("status", "==", "sending").get()
  ]);
  const candidateDocs = [...scheduledSnap.docs, ...sendingSnap.docs];

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`[scheduler] ${current.date} ${current.time} ${TZ} - found ${candidateDocs.length} candidate post(s)`);

  for (const postDoc of candidateDocs) {
    const post = postDoc.data() || {};
    const scheduledTime = String(post.scheduledTime || "");

    if (!isDue(post.scheduledDate, scheduledTime, current)) {
      skipped += 1;
      console.log(`[scheduler] skip ${postDoc.id}: scheduled for ${post.scheduledDate} ${scheduledTime}`);
      continue;
    }

    const claimed = await claimPost(postDoc.ref, current);
    if (!claimed) {
      skipped += 1;
      console.log(`[scheduler] skip ${postDoc.id}: already claimed or no longer due`);
      continue;
    }

    try {
      const entityId = String(post.entityId || "");
      if (!entityId) throw new Error("Post has no entityId.");

      const [entitySnap, serviceSnap] = await Promise.all([
        db.doc(`entities/${entityId}`).get(),
        post.serviceId ? db.doc(`services/${post.serviceId}`).get() : Promise.resolve(null)
      ]);

      if (!entitySnap.exists) throw new Error("Entity no longer exists.");

      const entityData = entitySnap.data() || {};
      const entity = entityData.name || "Unknown entity";
      const service = serviceSnap?.exists
        ? serviceSnap.data()?.name || "General / No specific service"
        : "General / No specific service";

      const text = [
        "<b>📢 TODAY'S INSTAGRAM POST</b>",
        "",
        `<b>Entity:</b> ${escapeHtml(entity)}`,
        `<b>Service:</b> ${escapeHtml(service)}`,
        `<b>Reminder time:</b> ${escapeHtml(scheduledTime)}`,
        `<b>Date:</b> ${escapeHtml(post.scheduledDate)}`,
        "",
        "<b>Description:</b>",
        escapeHtml(post.description || "—"),
        "",
        "<b>Hashtags:</b>",
        escapeHtml(post.hashtags || "—"),
        "",
        post.imageUrl
          ? `🖼 <a href="${escapeHtml(post.imageUrl)}">Open Cloudinary image</a>`
          : "🖼 Image link is unavailable.",
        "",
        `⏰ ${escapeHtml(entity)} reminder time has arrived.`,
        "Manually post this image to Instagram, then press DONE below."
      ].join("\n");

      await telegramRequest("sendMessage", {
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[
            { text: "✓ DONE — POSTED TO INSTAGRAM", callback_data: `done:${postDoc.id}` }
          ]]
        }
      });

      await postDoc.ref.update({
        status: "pending",
        reminderSentAt: FieldValue.serverTimestamp(),
        reminderScheduledTime: scheduledTime,
        reminderDay: current.day,
        lastSchedulerError: FieldValue.delete(),
        sendingStartedAt: FieldValue.delete(),
        schedulerClaimedAt: FieldValue.delete()
      });

      sent += 1;
      console.log(`[scheduler] SENT ${postDoc.id} -> ${entity} at ${scheduledTime}`);
    } catch (error) {
      failed += 1;
      console.error(`[scheduler] FAILED ${postDoc.id}:`, error.message);
      await postDoc.ref.update({
        status: "scheduled",
        lastSchedulerError: String(error.message || "Telegram delivery failed").slice(0, 500),
        lastSchedulerErrorAt: FieldValue.serverTimestamp(),
        sendingStartedAt: FieldValue.delete(),
        schedulerClaimedAt: FieldValue.delete(),
        retryCount: FieldValue.increment(1)
      }).catch(updateError => console.error(`[scheduler] Could not restore ${postDoc.id}:`, updateError.message));
    }
  }

  return { sent, skipped, failed, date: current.date, time: current.time, day: current.day };
}

async function verifySuperAdmin(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) return res.status(401).json({ error: "Authentication required." });
    const token = header.slice(7);
    const decoded = await auth.verifyIdToken(token);
    if (!(await isSuperAdminUid(decoded.uid))) {
      return res.status(403).json({ error: "Super Admin access required." });
    }
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Authentication error:", error.message);
    return res.status(401).json({ error: "Invalid or unauthorized Firebase session." });
  }
}

function verifyCronSecret(req) {
  if (!CRON_SECRET) return false;
  const provided = req.headers["x-cron-secret"] || req.query.secret || "";
  return provided === CRON_SECRET;
}

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed by CORS."));
  },
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Cron-Secret"]
}));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "meat-uploaded-server",
    timezone: TZ,
    time: new Date().toISOString()
  });
});

app.post("/api/telegram/test", verifySuperAdmin, async (_req, res) => {
  try {
    const telegramSnap = await db.doc("telegram/primary").get();
    const chatId = String(telegramSnap.data()?.chatId || "");
    if (!chatId) return res.status(400).json({ error: "No Telegram chat ID is saved." });

    await telegramRequest("sendMessage", {
      chat_id: chatId,
      text: "✅ Meat Uploaded Telegram test is working.\n\nThe Render backend is connected successfully."
    });

    res.json({ ok: true, message: "Telegram test message sent." });
  } catch (error) {
    console.error("Telegram test error:", error);
    res.status(500).json({ error: error.message || "Telegram test failed." });
  }
});

app.post("/api/telegram/webhook", async (req, res) => {
  if (TELEGRAM_WEBHOOK_SECRET) {
    const provided = req.headers["x-telegram-bot-api-secret-token"] || "";
    if (provided !== TELEGRAM_WEBHOOK_SECRET) return res.status(401).send("Unauthorized");
  }

  try {
    const callback = req.body?.callback_query;
    if (!callback?.data?.startsWith("done:")) return res.status(200).send("ok");

    const telegramSnap = await db.doc("telegram/primary").get();
    const configuredChatId = String(telegramSnap.data()?.chatId || "");
    const callbackChatId = String(callback.message?.chat?.id || "");
    if (!configuredChatId || configuredChatId !== callbackChatId) {
      return res.status(403).send("Unauthorized chat");
    }

    const postId = callback.data.slice(5);
    const postRef = db.doc(`posts/${postId}`);
    const postSnap = await postRef.get();
    if (!postSnap.exists) return res.status(404).send("Post not found");

    const post = postSnap.data() || {};
    if (post.status === "completed") {
      await telegramRequest("answerCallbackQuery", {
        callback_query_id: callback.id,
        text: "This post is already completed."
      });
      return res.status(200).send("ok");
    }

    await postRef.update({
      status: "completed",
      completedAt: FieldValue.serverTimestamp(),
      completedBy: "super-admin-telegram"
    });

    await telegramRequest("answerCallbackQuery", {
      callback_query_id: callback.id,
      text: "Marked as completed."
    });

    if (callback.message?.message_id) {
      await telegramRequest("editMessageReplyMarkup", {
        chat_id: callbackChatId,
        message_id: callback.message.message_id,
        reply_markup: { inline_keyboard: [] }
      });
    }

    return res.status(200).send("ok");
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return res.status(500).send("Internal error");
  }
});

app.post("/api/scheduler/run", async (req, res) => {
  if (!verifyCronSecret(req)) return res.status(401).json({ error: "Invalid cron secret." });
  try {
    const result = await sendScheduledReminders();
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error("Scheduler error:", error);
    res.status(500).json({ error: error.message || "Scheduler failed." });
  }
});

const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath, { maxAge: "1h", index: false }));
app.get(/^(?!\/api\/).*/, (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(distPath, "index.html"), error => {
    if (error) next(error);
  });
});

async function runSchedulerOnce() {
  const result = await sendScheduledReminders();
  console.log("Scheduler result:", JSON.stringify(result));
}

if (process.argv.includes("--scheduler-once")) {
  runSchedulerOnce()
    .then(() => process.exit(0))
    .catch(error => {
      console.error("Scheduler fatal error:", error);
      process.exit(1);
    });
} else {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Meat Uploaded server listening on port ${PORT}`);
    configureTelegramWebhook();
  });
}

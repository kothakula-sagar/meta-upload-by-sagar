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
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(data.description || `Telegram API returned HTTP ${response.status}.`);
  }
  return data;
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

function getDownloadName(service, entity) {
  return `${service || "General"} of ${entity || "Entity"} by sagar`;
}

async function sendScheduledReminders() {
  const current = nowInIndia();
  const [settingsSnap, telegramSnap] = await Promise.all([
    db.doc("settings/general").get(),
    db.doc("telegram/primary").get()
  ]);

  if (!settingsSnap.exists || !telegramSnap.exists) {
    return { sent: 0, reason: "Telegram or schedule settings are not configured." };
  }

  const settings = settingsSnap.data() || {};
  const chatId = String(telegramSnap.data()?.chatId || "");
  const daySetting = settings.schedule?.[current.day];

  if (!chatId || !daySetting?.enabled || !daySetting.time) {
    return { sent: 0, reason: "No enabled Telegram schedule for today." };
  }

  const [hour, minute] = String(daySetting.time).split(":").map(Number);
  const configuredTotal = hour * 60 + minute;
  const [currentHour, currentMinute] = current.time.split(":").map(Number);
  const currentTotal = currentHour * 60 + currentMinute;

  if (currentTotal < configuredTotal) {
    return { sent: 0, reason: `Scheduled time ${daySetting.time} has not arrived.` };
  }

  const postsSnap = await db.collection("posts")
    .where("scheduledDate", "==", current.date)
    .where("status", "==", "scheduled")
    .get();

  let sent = 0;
  for (const postDoc of postsSnap.docs) {
    const post = postDoc.data();
    const [entitySnap, serviceSnap] = await Promise.all([
      db.doc(`entities/${post.entityId}`).get(),
      post.serviceId ? db.doc(`services/${post.serviceId}`).get() : Promise.resolve(null)
    ]);

    const entity = entitySnap?.exists ? entitySnap.data().name : "Unknown entity";
    const service = serviceSnap?.exists ? serviceSnap.data().name : "General / No specific service";

    const text = [
      "<b>📢 TODAY'S INSTAGRAM POST</b>",
      "",
      `<b>Entity:</b> ${escapeHtml(entity)}`,
      `<b>Service:</b> ${escapeHtml(service)}`,
      `<b>Scheduled:</b> ${escapeHtml(post.scheduledDate)} · ${escapeHtml(post.scheduledTime || daySetting.time)}`,
      "",
      "<b>Description:</b>",
      escapeHtml(post.description || "—"),
      "",
      "<b>Hashtags:</b>",
      escapeHtml(post.hashtags || "—"),
      "",
      `🖼 <a href="${escapeHtml(post.imageUrl || "")}">Open Cloudinary image</a>`,
      "",
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
      reminderSentAt: FieldValue.serverTimestamp()
    });
    sent += 1;
  }

  return { sent, date: current.date, time: current.time };
}

async function verifySuperAdmin(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) return res.status(401).json({ error: "Authentication required." });
    const token = header.slice(7);
    const decoded = await auth.verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired Firebase session." });
  }
}

function verifyCronSecret(req) {
  if (!CRON_SECRET) return false;
  const provided = req.headers["x-cron-secret"] || req.query.secret || "";
  return provided === CRON_SECRET;
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "meat-uploaded-server", time: new Date().toISOString() });
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
app.use(express.static(distPath));
app.get(/^(?!\/api\/).*/, (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(distPath, "index.html"), error => {
    if (error) next(error);
  });
});

async function runSchedulerOnce() {
  const result = await sendScheduledReminders();
  console.log("Scheduler result:", result);
}

if (process.argv.includes("--scheduler-once")) {
  runSchedulerOnce()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
} else {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Meat Uploaded server listening on port ${PORT}`);
  });
}

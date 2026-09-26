import "dotenv/config";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const uid = String(process.env.ADMIN_UID || "").trim();
const projectId = process.env.FIREBASE_PROJECT_ID || "meta-upload-b46c8";
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!uid || !clientEmail || !privateKey) {
  console.error("Required environment variables: ADMIN_UID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId
  });
}

const db = getFirestore();
await db.doc(`admins/${uid}`).set({
  uid,
  role: "super_admin",
  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}, { merge: true });

console.log(`Super Admin enabled for Firebase UID: ${uid}`);

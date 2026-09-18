import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

import { firebaseConfig } from "../firebase-config";

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error("Firebase web configuration is missing. Create a .env file from .env.example.");
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
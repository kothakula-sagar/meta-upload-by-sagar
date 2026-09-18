import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "../lib/firebase";

export const entitiesRef = collection(db, "entities");
export const servicesRef = collection(db, "services");
export const postsRef = collection(db, "posts");

export async function getEntities() {
  const snap = await getDocs(query(entitiesRef, where("active", "==", true)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getServices() {
  const snap = await getDocs(query(servicesRef, where("active", "==", true)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getPosts() {
  const snap = await getDocs(postsRef);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => p.status !== "deleted")
    .sort((a, b) => String(b.scheduledDate || "").localeCompare(String(a.scheduledDate || "")));
}

export async function createEntity(name, description = "") {
  return addDoc(entitiesRef, {
    name,
    description,
    active: true,
    createdAt: serverTimestamp()
  });
}

export async function updateEntity(id, data) {
  return updateDoc(doc(db, "entities", id), data);
}

export async function deleteEntity(id) {
  return updateDoc(doc(db, "entities", id), { active: false });
}

export async function createService(entityId, name, description = "") {
  return addDoc(servicesRef, {
    entityId,
    name,
    description,
    active: true,
    createdAt: serverTimestamp()
  });
}

export async function deleteService(id) {
  return updateDoc(doc(db, "services", id), { active: false });
}

export async function createPost(data) {
  return addDoc(postsRef, {
    ...data,
    status: "scheduled",
    uploadedAt: serverTimestamp(),
    createdAt: serverTimestamp()
  });
}

export async function deletePost(id) {
  return updateDoc(doc(db, "posts", id), {
    status: "deleted",
    deletedAt: serverTimestamp()
  });
}

export async function updatePost(id, data) {
  return updateDoc(doc(db, "posts", id), data);
}

export async function saveSettings(schedule) {
  return setDoc(doc(db, "settings", "general"), {
    schedule,
    timezone: "Asia/Kolkata",
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function saveTelegram(chatId) {
  return setDoc(doc(db, "telegram", "primary"), {
    chatId,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export function watchPosts(callback) {
  return onSnapshot(postsRef, snap => {
    const posts = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(p => p.status !== "deleted");
    callback(posts);
  });
}
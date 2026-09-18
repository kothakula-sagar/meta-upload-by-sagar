import { MessageCircle, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { saveTelegram } from "../services/firestore";
import { auth } from "../lib/firebase";

export default function Telegram({data,refresh,notify}) {
  const [chatId,setChatId]=useState(data.telegram?.chatId || "");
  const [saving,setSaving]=useState(false);
  const [testing,setTesting]=useState(false);

  useEffect(()=>setChatId(data.telegram?.chatId || ""),[data.telegram?.chatId]);

  async function sendTest() {
    setTesting(true);
    try {
      if (!chatId.trim()) throw new Error("Save a Telegram chat ID first.");
      await saveTelegram(chatId.trim());
      const user = auth.currentUser;
      if (!user) throw new Error("Please sign in again.");
      const token = await user.getIdToken();
      const response = await fetch("/api/telegram/test", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Telegram test failed.");
      refresh();
      notify("Telegram test message sent successfully.");
    } catch (err) {
      notify(err.message || "Telegram test failed.", "error");
    } finally {
      setTesting(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try { await saveTelegram(chatId.trim()); refresh(); notify("Telegram chat ID saved."); }
    catch(err){ notify(err.message,"error"); }
    finally { setSaving(false); }
  }

  return <div className="mx-auto max-w-2xl space-y-6">
    <div><h2 className="text-xl font-bold tracking-tight">Telegram</h2><p className="mt-1 text-sm text-slate-400">Connect one Telegram chat for Super Admin posting reminders.</p></div>
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="flex items-center gap-4"><div className="grid h-12 w-12 place-items-center rounded-xl bg-slate-950 text-white"><MessageCircle size={20}/></div><div><h3 className="font-bold">Primary Telegram chat</h3><p className="text-xs text-slate-400">Enter the chat ID manually.</p></div></div>
      <form onSubmit={submit} className="mt-6">
        <label className="field-label">Telegram Chat ID</label>
        <input required value={chatId} onChange={e=>setChatId(e.target.value)} className="field" placeholder="123456789"/>
        <p className="mt-2 text-xs leading-5 text-slate-400">The Telegram bot token stays on the Render backend. Never put it in React or GitHub.</p>
        <div className="mt-5 flex gap-2">
          <button disabled={saving} className="btn-primary">{saving ? "Saving..." : "Save chat ID"}</button>
          <button type="button" disabled={testing || saving} onClick={sendTest} className="btn-secondary"><Send size={14}/> {testing ? "Sending..." : "Send test"}</button>
        </div>
      </form>
      <div className={`mt-6 rounded-xl p-4 text-xs font-semibold ${chatId ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
        {chatId ? "Connected · chat ID is saved." : "Not connected · enter a chat ID."}
      </div>
    </div>
  </div>;
}
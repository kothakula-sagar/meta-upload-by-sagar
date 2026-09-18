import { useEffect, useState } from "react";
import { saveSettings } from "../services/firestore";

const days=["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

export default function Settings({data,refresh,notify}) {
  const [schedule,setSchedule]=useState({});
  const [saving,setSaving]=useState(false);

  useEffect(()=>{
    const incoming=data.settings?.schedule || {};
    setSchedule(Object.fromEntries(days.map(day=>[day,{enabled:incoming[day]?.enabled ?? (day !== "sunday"),time:incoming[day]?.time || "10:00"}])));
  },[data.settings]);

  function change(day,key,value) {
    setSchedule(s=>({...s,[day]:{...s[day],[key]:value}}));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try { await saveSettings(schedule); refresh(); notify("Weekly schedule saved."); }
    catch(err){notify(err.message,"error");}
    finally{setSaving(false);}
  }

  return <div className="space-y-6">
    <div><h2 className="text-xl font-bold tracking-tight">Settings</h2><p className="mt-1 text-sm text-slate-400">Set the Telegram reminder time once for each day. Upload / Schedule automatically uses this time.</p></div>
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white shadow-soft">
      <div className="divide-y divide-slate-100">
        {days.map((day,index)=><div key={day} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center">
          <div className="w-28"><div className="text-sm font-bold capitalize">{day}</div><div className="text-[10px] text-slate-400">{index===6?"Optional":"Reminder day"}</div></div>
          <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={Boolean(schedule[day]?.enabled)} onChange={e=>change(day,"enabled",e.target.checked)} className="h-4 w-4 rounded border-slate-300"/> Enabled</label>
          <input type="time" value={schedule[day]?.time || "10:00"} onChange={e=>change(day,"time",e.target.value)} className="field sm:ml-auto sm:w-40"/>
        </div>)}
      </div>
      <div className="flex justify-end border-t border-slate-100 p-5"><button disabled={saving} className="btn-primary">{saving?"Saving...":"Save schedule"}</button></div>
    </form>
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-xs leading-6 text-slate-500"><strong className="text-slate-700">Workflow:</strong> at the configured time, the Render scheduler checks for today's scheduled post, sends its Cloudinary image link + entity + service + description + hashtags to Telegram, and provides the <strong>DONE — POSTED TO INSTAGRAM</strong> button. Instagram itself is still manual.</div>
  </div>;
}
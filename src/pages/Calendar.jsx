import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { dateKey } from "../lib/utils";

const week = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const dayKeys = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

export default function Calendar({data}) {
  const [month,setMonth]=useState(new Date());
  const year=month.getFullYear(), monthIndex=month.getMonth();
  const first=new Date(year,monthIndex,1);
  const daysInMonth=new Date(year,monthIndex+1,0).getDate();
  const start=(first.getDay()+6)%7;
  const cells=[];

  for(let i=0;i<start;i++) cells.push(<div key={`blank-${i}`} className="hidden min-h-[110px] sm:block"/>);

  for(let d=1;d<=daysInMonth;d++) {
    const key=`${year}-${String(monthIndex+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const posts=data.posts.filter(p=>p.scheduledDate===key);
    const today=key===dateKey();
    const completed=posts.some(p=>p.status==="completed");
    const pending=posts.some(p=>["scheduled","pending"].includes(p.status));
    const dow=(new Date(year,monthIndex,d).getDay()+6)%7;
    const scheduledEntities = data.entities.filter(entity => entity.telegramSchedule?.[dayKeys[dow]]?.enabled);
    const postEntityIds = new Set(posts.map(post => post.entityId));
    const hasMissingEntityUpload = scheduledEntities.some(entity => !postEntityIds.has(entity.id));
    const enabled = scheduledEntities.length > 0;
    const tone=today ? "bg-stone-100 border-stone-200" : completed ? "bg-emerald-50 border-emerald-200" : posts.length ? (hasMissingEntityUpload ? "bg-rose-50 border-rose-200" : "bg-slate-50 border-slate-200") : enabled ? "bg-rose-50 border-rose-200" : "bg-white border-slate-200";

    cells.push(
      <div key={key} className={`min-h-[110px] rounded-xl border p-2.5 ${tone}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600">{d}</span>
          {today && <span className="rounded-full bg-stone-300 px-1.5 py-0.5 text-[8px] font-black text-slate-700">TODAY</span>}
        </div>
        <div className="mt-3 space-y-1">
          {posts.slice(0,2).map(p=><div key={p.id} className="truncate rounded-md bg-white/80 px-1.5 py-1 text-[10px] font-semibold text-slate-600">{data.services.find(s=>s.id===p.serviceId)?.name || "Post"}</div>)}
          {!posts.length && enabled && <div className="mt-5 text-[10px] font-semibold text-rose-500">No upload</div>}
        </div>
      </div>
    );
  }

  return <div className="space-y-5">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div><h2 className="text-xl font-bold tracking-tight">Calendar</h2><p className="mt-1 text-sm text-slate-400">Green = completed · stone = today · red = at least one entity has a reminder schedule but no upload.</p></div>
      <div className="flex items-center gap-2">
        <button onClick={()=>setMonth(new Date(year,monthIndex-1,1))} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white"><ChevronLeft size={16}/></button>
        <div className="min-w-36 text-center text-sm font-bold">{month.toLocaleDateString("en-IN",{month:"long",year:"numeric"})}</div>
        <button onClick={()=>setMonth(new Date(year,monthIndex+1,1))} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white"><ChevronRight size={16}/></button>
      </div>
    </div>
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-soft md:p-5">
      <div className="grid grid-cols-7 gap-1.5 pb-2">{week.map(x=><div key={x} className="py-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">{x}</div>)}</div>
      <div className="grid grid-cols-7 gap-1.5">{cells}</div>
      <div className="mt-5 flex flex-wrap gap-4 border-t border-slate-100 pt-4 text-[11px] font-medium text-slate-500">
        <Legend cls="bg-emerald-500" text="Completed"/>
        <Legend cls="bg-stone-300" text="Today"/>
        <Legend cls="bg-rose-400" text="No upload"/>
        <Legend cls="bg-slate-300" text="Scheduled"/>
      </div>
    </div>
  </div>;
}

function Legend({cls,text}) { return <span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${cls}`}/>{text}</span>; }
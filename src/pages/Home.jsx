import { CalendarDays, CheckCircle2, FileImage, LayoutGrid, Plus, ArrowRight } from "lucide-react";
import StatCard from "../components/StatCard";
import { dateKey, formatDate } from "../lib/utils";

export default function Home({ data, setPage }) {
  const today = dateKey();
  const todayPosts = data.posts.filter(p => p.scheduledDate === today);
  const scheduled = data.posts.filter(p => ["scheduled", "pending"].includes(p.status)).length;
  const completed = data.posts.filter(p => p.status === "completed").length;

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-slate-400">
            {new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeZone: "Asia/Kolkata" }).format(new Date())}
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">Good morning, Sagar.</h2>
        </div>
        <button onClick={() => setPage("posts")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800">
          <Plus size={16} /> Upload content
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Entities" value={data.entities.length} helper="Active businesses" icon={<LayoutGrid size={16} />} />
        <StatCard label="Scheduled posts" value={scheduled} helper="Awaiting publishing" icon={<CalendarDays size={16} />} />
        <StatCard label="Today's uploads" value={todayPosts.length} helper="Scheduled for today" icon={<FileImage size={16} />} />
        <StatCard label="Completed" value={completed} helper="Marked as posted" icon={<CheckCircle2 size={16} />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="text-sm font-bold">Today's content</h3>
              <p className="mt-0.5 text-xs text-slate-400">Posts expected today.</p>
            </div>
            <button onClick={() => setPage("calendar")} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900">Calendar <ArrowRight size={13} /></button>
          </div>

          {todayPosts.length ? (
            <div className="divide-y divide-slate-100">
              {todayPosts.map(post => {
                const entity = data.entities.find(e => e.id === post.entityId)?.name || "Unknown entity";
                const service = data.services.find(s => s.id === post.serviceId)?.name || "Unknown service";
                return (
                  <div key={post.id} className="flex items-center gap-3 px-5 py-4">
                    <img src={post.imageUrl} className="h-14 w-14 rounded-xl object-cover" alt="" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">{entity}</div>
                      <div className="truncate text-xs text-slate-400">{service}</div>
                    </div>
                    <div className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      post.status === "completed" ? "bg-emerald-50 text-emerald-700" :
                      post.status === "pending" ? "bg-amber-50 text-amber-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>{post.status}</div>
                    <div className="hidden text-right text-xs text-slate-400 sm:block">{(() => { const entityData = data.entities.find(e => e.id === post.entityId); const day = new Date(`${post.scheduledDate}T12:00:00`).getDay(); const key = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][day]; return entityData?.telegramSchedule?.[key]?.time || post.scheduledTime || "Not configured"; })()}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <div className="text-sm font-bold text-slate-700">No content scheduled for today</div>
              <div className="mt-1 text-xs text-slate-400">Create a poster and choose today's date.</div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-sm font-bold">Quick setup</h3>
          <p className="mt-1 text-xs text-slate-400">The essentials for your workflow.</p>
          <div className="mt-5 space-y-3">
            <Setup label="Create entities" done={data.entities.length > 0} onClick={() => setPage("entities")} />
            <Setup label="Connect Telegram" done={Boolean(data.telegram?.chatId)} onClick={() => setPage("telegram")} />
            <Setup label="Set entity Telegram schedules" done={data.entities.length > 0 && data.entities.every(entity => Object.values(entity.telegramSchedule || {}).some(v => v?.enabled))} onClick={() => setPage("settings")} />
          </div>
        </section>
      </div>
    </div>
  );
}

function Setup({ label, done, onClick }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left hover:bg-slate-50">
      <div className={`grid h-8 w-8 place-items-center rounded-lg text-xs font-bold ${done ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
        {done ? "✓" : "•"}
      </div>
      <span className="flex-1 text-sm font-semibold">{label}</span>
      <ArrowRight size={14} className="text-slate-300" />
    </button>
  );
}
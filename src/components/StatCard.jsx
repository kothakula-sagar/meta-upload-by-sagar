export default function StatCard({ label, value, helper, icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600">{icon}</div>
      </div>
      <div className="mt-4 text-3xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{helper}</div>
    </div>
  );
}
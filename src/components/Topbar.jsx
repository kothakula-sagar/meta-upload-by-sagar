import { Menu } from "lucide-react";

export default function Topbar({ title, subtitle, onMenu }) {
  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur md:px-8">
      <div className="flex items-center gap-3">
        <button onClick={onMenu} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 lg:hidden">
          <Menu size={18} />
        </button>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-950">{title}</h1>
          <p className="hidden text-xs text-slate-400 sm:block">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-500 sm:block">Asia/Kolkata</span>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">S</div>
      </div>
    </header>
  );
}
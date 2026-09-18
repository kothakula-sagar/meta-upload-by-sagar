import {
  CalendarDays,
  FileImage,
  Home,
  LayoutGrid,
  LogOut,
  MessageCircle,
  Settings,
  X
} from "lucide-react";

const nav = [
  ["home", "Home", Home],
  ["entities", "Entities & Services", LayoutGrid],
  ["posts", "Upload / Schedule", FileImage],
  ["calendar", "Calendar", CalendarDays],
  ["telegram", "Telegram", MessageCircle],
  ["settings", "Settings", Settings]
];

export default function Sidebar({ page, setPage, open, setOpen, onLogout }) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/30 lg:hidden ${open ? "block" : "hidden"}`}
        onClick={() => setOpen(false)}
      />

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-5">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-sm font-black text-white">M</div>
            <div>
              <div className="text-sm font-bold tracking-tight">Meat Uploaded</div>
              <div className="text-[11px] text-slate-400">Content control center</div>
            </div>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)}><X size={18} /></button>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => { setPage(id); setOpen(false); }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                page === id ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon size={17} strokeWidth={1.9} />
              {label}
            </button>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="text-xs font-bold text-slate-700">Super Admin</div>
            <div className="mt-1 truncate text-[11px] text-slate-400">Single administrator account</div>
          </div>
          <button onClick={onLogout} className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
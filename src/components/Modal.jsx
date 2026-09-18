export default function Modal({ title, subtitle, onClose, children, width = "max-w-lg" }) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={e => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className={`max-h-[90vh] w-full ${width} overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl`}>
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-base font-bold">{title}</h3>
            {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-xl text-slate-400 hover:bg-slate-100">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
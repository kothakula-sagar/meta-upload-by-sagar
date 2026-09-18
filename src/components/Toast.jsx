export default function Toast({ message, type = "success", onClose }) {
  return (
    <div className={`fixed bottom-5 right-5 z-[100] max-w-sm rounded-xl border bg-white px-4 py-3 text-sm font-semibold shadow-soft ${
      type === "error" ? "border-rose-200 text-rose-700" : "border-emerald-200 text-emerald-700"
    }`}>
      {message}
      <button onClick={onClose} className="ml-3 text-slate-300">×</button>
    </div>
  );
}
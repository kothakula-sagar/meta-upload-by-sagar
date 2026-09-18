export function dateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const get = type => parts.find(p => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function formatDate(value, withTime = true) {
  if (!value) return "—";

  let date;
  if (value?.toDate) date = value.toDate();
  else if (value?.seconds) date = new Date(value.seconds * 1000);
  else date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: withTime ? "short" : undefined,
    timeZone: "Asia/Kolkata"
  }).format(date);
}

export function escapeFileName(text) {
  return String(text)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function getDownloadName(service, entity) {
  return `${escapeFileName(service)} of ${escapeFileName(entity)} by Sagar.jpg`;
}

export function normaliseHashtags(value) {
  return String(value || "")
    .split(/[\s,]+/)
    .map(v => v.trim())
    .filter(Boolean)
    .map(v => v.startsWith("#") ? v : `#${v}`)
    .join(" ");
}

export function statusLabel(status) {
  const labels = {
    scheduled: "Scheduled",
    pending: "Pending",
    completed: "Completed",
    missed: "Missed"
  };
  return labels[status] || "Unknown";
}
import { useEffect, useMemo, useState } from "react";
import { Building2, Save } from "lucide-react";
import { updateEntity } from "../services/firestore";

const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function defaultSchedule() {
  return Object.fromEntries(days.map(day => [day, {
    enabled: day !== "sunday",
    time: "10:00"
  }]));
}

function cloneSchedule(source = {}) {
  const fallback = defaultSchedule();
  return Object.fromEntries(days.map(day => [day, {
    enabled: Boolean(source?.[day]?.enabled ?? fallback[day].enabled),
    time: source?.[day]?.time || fallback[day].time
  }]));
}

export default function Settings({ data, refresh, notify }) {
  const [schedules, setSchedules] = useState({});
  const [saving, setSaving] = useState(false);

  const entities = useMemo(() => data.entities || [], [data.entities]);

  useEffect(() => {
    const next = {};
    for (const entity of entities) {
      next[entity.id] = cloneSchedule(entity.telegramSchedule || data.settings?.schedule || {});
    }
    setSchedules(next);
  }, [entities, data.settings?.schedule]);

  function change(entityId, day, key, value) {
    setSchedules(current => ({
      ...current,
      [entityId]: {
        ...current[entityId],
        [day]: {
          ...current[entityId]?.[day],
          [key]: value
        }
      }
    }));
  }

  async function saveAll(event) {
    event.preventDefault();
    if (!entities.length) {
      notify("Create an entity first.", "error");
      return;
    }

    setSaving(true);
    try {
      await Promise.all(entities.map(entity =>
        updateEntity(entity.id, { telegramSchedule: schedules[entity.id] || defaultSchedule() })
      ));
      await refresh();
      notify("Entity Telegram schedules saved.");
    } catch (error) {
      notify(error.message || "Could not save schedules.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Settings</h2>
        <p className="mt-1 text-sm text-slate-400">
          Set Telegram reminder times separately for each entity. Posts automatically use the selected entity's schedule.
        </p>
      </div>

      {!entities.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-soft">
          <Building2 className="mx-auto text-slate-300" size={30} />
          <div className="mt-3 text-sm font-bold text-slate-700">No entities yet</div>
          <div className="mt-1 text-xs text-slate-400">Create Abra Logistics, Abra Global Shipping, or another entity first.</div>
        </div>
      ) : (
        <form onSubmit={saveAll} className="space-y-5">
          {entities.map(entity => (
            <section key={entity.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-white">
                  <Building2 size={17} />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold">{entity.name}</h3>
                  <p className="text-xs text-slate-400">Telegram reminder schedule for this entity</p>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {days.map((day, index) => {
                  const setting = schedules[entity.id]?.[day] || { enabled: false, time: "10:00" };
                  return (
                    <div key={day} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center">
                      <div className="w-28">
                        <div className="text-sm font-bold capitalize">{day}</div>
                        <div className="text-[10px] text-slate-400">{index === 6 ? "Optional" : "Reminder day"}</div>
                      </div>
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={Boolean(setting.enabled)}
                          onChange={event => change(entity.id, day, "enabled", event.target.checked)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        Enabled
                      </label>
                      <input
                        type="time"
                        value={setting.time || "10:00"}
                        onChange={event => change(entity.id, day, "time", event.target.value)}
                        className="field sm:ml-auto sm:w-40"
                        disabled={!setting.enabled}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          <div className="flex justify-end">
            <button disabled={saving} className="btn-primary">
              <Save size={15} />
              {saving ? "Saving..." : "Save all entity schedules"}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-xs leading-6 text-slate-500">
        <strong className="text-slate-700">How it works:</strong> each entity has its own weekly Telegram schedule. For example, Abra Logistics can use Monday at 10:00 while Abra Global Shipping uses Monday at 14:00. When the Render scheduler runs, it checks each scheduled post against that post's entity schedule and sends the Telegram message only when that entity's time has arrived. Instagram publishing remains manual.
      </div>
    </div>
  );
}

import { Download, Plus, Trash2, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";
import Modal from "../components/Modal";
import { createPost, deletePost } from "../services/firestore";
import { uploadImage } from "../services/cloudinary";
import { getDownloadName, normaliseHashtags } from "../lib/utils";

const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export default function Posts({ data, refresh, notify }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Upload / Schedule</h2>
          <p className="mt-1 text-sm text-slate-400">Prepare content for manual Instagram publishing.</p>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">
          <Plus size={16}/> New post
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-soft">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="text-sm font-bold">Content library</div>
          <div className="mt-0.5 text-xs text-slate-400">{data.posts.length} active post{data.posts.length === 1 ? "" : "s"}</div>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
          {data.posts.length ? data.posts.map(post => (
            <PostCard key={post.id} post={post} data={data} onDelete={async()=>{
              if(confirm("Delete this post?")) {
                await deletePost(post.id);
                notify("Post deleted.");
                refresh();
              }
            }} />
          )) : (
            <div className="sm:col-span-2 xl:col-span-3 py-12 text-center text-sm font-bold text-slate-600">
              No scheduled posts
            </div>
          )}
        </div>
      </div>

      {open && <PostForm data={data} close={()=>setOpen(false)} refresh={refresh} notify={notify}/>}
    </div>
  );
}

function PostCard({post,data,onDelete}) {
  const entity = data.entities.find(e=>e.id===post.entityId)?.name || "Unknown entity";
  const service = data.services.find(s=>s.id===post.serviceId)?.name || "General / No specific service";
  const statusClass =
    post.status === "completed" ? "bg-emerald-50 text-emerald-700" :
    post.status === "pending" ? "bg-amber-50 text-amber-700" :
    "bg-slate-100 text-slate-600";

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
      <div className="relative aspect-[4/3] bg-slate-100"><img src={post.imageUrl} className="h-full w-full object-cover" alt=""/></div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><h3 className="truncate text-sm font-bold">{entity}</h3><p className="truncate text-xs text-slate-400">{service}</p></div>
          <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusClass}`}>{post.status}</span>
        </div>
        <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">{post.description || "No description"}</p>
        <div className="mt-4 space-y-1 text-[11px] text-slate-400">
          <div>Uploaded · {post.uploadedAt?.toDate ? post.uploadedAt.toDate().toLocaleString("en-IN") : "Just now"}</div>
          <div>Scheduled · {post.scheduledDate} · {post.scheduledTime || "From Settings"}</div>
        </div>
        <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
          <a href={post.imageUrl} target="_blank" rel="noreferrer" download={getDownloadName(service,entity)} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><Download size={14}/> Download</a>
          <button onClick={onDelete} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15}/></button>
        </div>
      </div>
    </article>
  );
}

function PostForm({data,close,refresh,notify}) {
  const [entityId,setEntityId]=useState(data.entities[0]?.id || "");
  const [file,setFile]=useState(null);
  const [description,setDescription]=useState("");
  const [hashtags,setHashtags]=useState("");
  const [date,setDate]=useState(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }));
  const [progress,setProgress]=useState(null);
  const [saving,setSaving]=useState(false);

  const services = useMemo(() => data.services.filter(s=>s.entityId===entityId), [data.services, entityId]);

  const selectedDay = useMemo(() => {
    if (!date) return null;
    return dayKeys[new Date(`${date}T12:00:00`).getDay()];
  }, [date]);

  const daySetting = selectedDay ? data.settings?.schedule?.[selectedDay] : null;
  const reminderTime = daySetting?.enabled ? daySetting.time : "";

  async function submit(e) {
    e.preventDefault();
    if (!file) return notify("Please select an image.","error");
    if (!entityId) return notify("Please select an entity.","error");
    if (!daySetting?.enabled || !reminderTime) {
      return notify(`No upload time is enabled for ${selectedDay || "this date"}. Configure it in Settings first.`, "error");
    }

    setSaving(true);
    try {
      const upload=await uploadImage(file,setProgress);
      await createPost({
        entityId,
        serviceId: services[0]?.id || null,
        imageUrl:upload.secure_url,
        cloudinaryPublicId:upload.public_id || "",
        description:description.trim(),
        hashtags:normaliseHashtags(hashtags),
        scheduledDate:date,
        scheduledTime:reminderTime
      });
      close();
      refresh();
      notify(`Image uploaded. Telegram reminder is set for ${reminderTime}.`);
    } catch(err) {
      notify(err.message || "Upload failed.","error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Create scheduled post" subtitle="The reminder time comes automatically from Settings for the selected day." onClose={close}>
      <form onSubmit={submit} className="space-y-4 p-5">
        <Field label="Entity *">
          <select className="field" value={entityId} onChange={e=>setEntityId(e.target.value)} required>
            {data.entities.length ? data.entities.map(e=><option key={e.id} value={e.id}>{e.name}</option>) : <option value="">Create an entity first</option>}
          </select>
        </Field>

        <div>
          <span className="field-label">Service</span>
          {services.length ? (
            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700">
              {services.length === 1 ? services[0].name : `${services.length} services available · first service will be used`}
            </div>
          ) : (
            <div className="mt-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-400">
              No specific service required for this entity
            </div>
          )}
        </div>

        <Field label="Image *">
          <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center hover:border-slate-400">
            <UploadCloud size={22} className="text-slate-400"/>
            <span className="mt-2 text-sm font-semibold text-slate-600">{file ? file.name : "Choose an image"}</span>
            <span className="mt-1 text-xs text-slate-400">JPG, PNG or WEBP · max 10 MB</span>
            <input type="file" accept="image/*" className="hidden" onChange={e=>setFile(e.target.files?.[0] || null)}/>
          </label>
        </Field>

        <Field label="Description *"><textarea required rows="4" className="field" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Write the Instagram caption..."/></Field>
        <Field label="Hashtags"><input className="field" value={hashtags} onChange={e=>setHashtags(e.target.value)} placeholder="#logistics #business #shipping"/></Field>

        <Field label="Scheduled date *"><input required type="date" className="field" value={date} onChange={e=>setDate(e.target.value)}/></Field>

        <div className={`rounded-xl border p-4 ${daySetting?.enabled ? "border-slate-200 bg-slate-50" : "border-rose-200 bg-rose-50"}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Telegram reminder time</div>
              <div className="mt-1 text-sm font-bold text-slate-800">{selectedDay ? selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1) : "Select a date"}</div>
            </div>
            <div className="text-lg font-black text-slate-900">{reminderTime || "Not configured"}</div>
          </div>
          <p className={`mt-2 text-xs ${daySetting?.enabled ? "text-slate-400" : "text-rose-600"}`}>
            {daySetting?.enabled ? "Taken directly from Settings. No second time field is required." : `Enable ${selectedDay || "this day"} in Settings before scheduling this post.`}
          </p>
        </div>

        {progress !== null && <div className="rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-500">Uploading to Cloudinary · {progress}%</div>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={close} className="btn-secondary">Cancel</button>
          <button disabled={saving || !data.entities.length} className="btn-primary">{saving ? "Uploading..." : "Upload & schedule"}</button>
        </div>
      </form>
    </Modal>
  );
}

function Field({label,children}) { return <label className="block"><span className="field-label">{label}</span>{children}</label>; }

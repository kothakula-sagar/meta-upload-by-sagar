import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import Modal from "../components/Modal";
import { createEntity, createService, deleteEntity, deleteService, updateEntity } from "../services/firestore";

export default function Entities({ data, refresh, notify }) {
  const [entityModal, setEntityModal] = useState(null);
  const [serviceModal, setServiceModal] = useState(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Entities & Services</h2>
          <p className="mt-1 text-sm text-slate-400">Manage the businesses and services used for your posts.</p>
        </div>
        <button onClick={() => setEntityModal({ mode: "create" })} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white"><Plus size={16} /> Add entity</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {data.entities.length ? data.entities.map(entity => {
          const services = data.services.filter(s => s.entityId === entity.id);
          return (
            <div key={entity.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-950 text-sm font-black text-white">{entity.name.slice(0,1).toUpperCase()}</div>
                  <div className="min-w-0">
                    <h3 className="truncate font-bold">{entity.name}</h3>
                    <p className="mt-0.5 truncate text-xs text-slate-400">{entity.description || "No description"}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEntityModal({ mode:"edit", entity })} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800"><Pencil size={15}/></button>
                  <button onClick={async () => {
                    if (confirm(`Delete ${entity.name}?`)) {
                      await deleteEntity(entity.id); notify("Entity deleted."); refresh();
                    }
                  }} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15}/></button>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Services · {services.length}</span>
                  <button onClick={() => setServiceModal(entity)} className="text-xs font-bold text-slate-700">+ Add service</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {services.length ? services.map(service => (
                    <span key={service.id} className="group inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600">
                      {service.name}
                      <button onClick={async () => {
                        if(confirm(`Delete ${service.name}?`)) { await deleteService(service.id); notify("Service deleted."); refresh(); }
                      }} className="ml-1 text-slate-400 hover:text-rose-600"><Trash2 size={11}/></button>
                    </span>
                  )) : <span className="text-xs text-slate-400">No services added.</span>}
                </div>
              </div>
            </div>
          );
        }) : <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-soft"><div className="text-sm font-bold">No entities yet</div><div className="mt-1 text-xs text-slate-400">Create your first entity to start.</div></div>}
      </div>

      {entityModal && <EntityForm modal={entityModal} close={() => setEntityModal(null)} refresh={refresh} notify={notify} />}
      {serviceModal && <ServiceForm entity={serviceModal} close={() => setServiceModal(null)} refresh={refresh} notify={notify} />}
    </div>
  );
}

function EntityForm({ modal, close, refresh, notify }) {
  const [name, setName] = useState(modal.entity?.name || "");
  const [description, setDescription] = useState(modal.entity?.description || "");

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    if (modal.mode === "edit") await updateEntity(modal.entity.id, { name: name.trim(), description: description.trim() });
    else await createEntity(name.trim(), description.trim());
    close(); refresh(); notify(modal.mode === "edit" ? "Entity updated." : "Entity created.");
  }

  return <Modal title={modal.mode === "edit" ? "Edit entity" : "Add entity"} subtitle="Keep entity names clear and consistent." onClose={close}>
    <form onSubmit={submit} className="space-y-4 p-5">
      <Field label="Entity name *"><input required value={name} onChange={e=>setName(e.target.value)} className="field" placeholder="Abra Global Trading" /></Field>
      <Field label="Description"><textarea value={description} onChange={e=>setDescription(e.target.value)} className="field" rows="3" /></Field>
      <Actions close={close} submit={modal.mode === "edit" ? "Save changes" : "Create entity"} />
    </form>
  </Modal>;
}

function ServiceForm({ entity, close, refresh, notify }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    await createService(entity.id, name.trim(), description.trim());
    close(); refresh(); notify("Service added.");
  }

  return <Modal title="Add service" subtitle={`Service for ${entity.name}.`} onClose={close}>
    <form onSubmit={submit} className="space-y-4 p-5">
      <Field label="Service name *"><input required value={name} onChange={e=>setName(e.target.value)} className="field" placeholder="International Shipping" /></Field>
      <Field label="Description"><textarea value={description} onChange={e=>setDescription(e.target.value)} className="field" rows="3" /></Field>
      <Actions close={close} submit="Add service" />
    </form>
  </Modal>;
}

function Field({label,children}) { return <label className="block"><span className="field-label">{label}</span>{children}</label>; }
function Actions({close,submit}) { return <div className="flex justify-end gap-2"><button type="button" onClick={close} className="btn-secondary">Cancel</button><button className="btn-primary">{submit}</button></div>; }
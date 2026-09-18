import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "./lib/firebase";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Toast from "./components/Toast";
import Home from "./pages/Home";
import Entities from "./pages/Entities";
import Posts from "./pages/Posts";
import Calendar from "./pages/Calendar";
import Telegram from "./pages/Telegram";
import Settings from "./pages/Settings";
import { getEntities, getServices, getPosts } from "./services/firestore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./lib/firebase";

const pageMeta = {
  home:["Home","Your content publishing overview."],
  entities:["Entities & Services","Manage businesses and their services."],
  posts:["Upload / Schedule","Prepare content for manual Instagram publishing."],
  calendar:["Calendar","See planned, completed, missed and today's content."],
  telegram:["Telegram","Connect one Telegram chat for posting reminders."],
  settings:["Settings","Control the weekly Telegram reminder schedule."]
};

export default function App() {
  const [user,setUser]=useState(undefined);
  const [page,setPage]=useState("home");
  const [data,setData]=useState({entities:[],services:[],posts:[],settings:null,telegram:null});
  const [sidebar,setSidebar]=useState(false);
  const [toast,setToast]=useState(null);
  const [loading,setLoading]=useState(true);

  useEffect(()=>onAuthStateChanged(auth,u=>{setUser(u);setLoading(false);}),[]);

  async function refresh() {
    if(!auth.currentUser) return;
    try {
      const [entities,services,posts,settingsSnap,telegramSnap]=await Promise.all([
        getEntities(), getServices(), getPosts(),
        getDoc(doc(db,"settings","general")),
        getDoc(doc(db,"telegram","primary"))
      ]);
      setData({
        entities,services,posts,
        settings:settingsSnap.exists()?settingsSnap.data():{schedule:{}},
        telegram:telegramSnap.exists()?telegramSnap.data():{chatId:""}
      });
    } catch(err) {
      notify(err.message || "Could not load Firebase data.","error");
    }
  }

  useEffect(()=>{ if(user) refresh(); },[user]);

  function notify(message,type="success") {
    setToast({message,type});
    setTimeout(()=>setToast(null),3500);
  }

  if(loading) return <Loading />;
  if(!user) return <Login />;

  const [title,subtitle]=pageMeta[page];
  let content;
  if(page==="home") content=<Home data={data} setPage={setPage}/>;
  if(page==="entities") content=<Entities data={data} refresh={refresh} notify={notify}/>;
  if(page==="posts") content=<Posts data={data} refresh={refresh} notify={notify}/>;
  if(page==="calendar") content=<Calendar data={data}/>;
  if(page==="telegram") content=<Telegram data={data} refresh={refresh} notify={notify}/>;
  if(page==="settings") content=<Settings data={data} refresh={refresh} notify={notify}/>;

  return <div className="min-h-screen">
    <Sidebar page={page} setPage={setPage} open={sidebar} setOpen={setSidebar} onLogout={()=>signOut(auth)}/>
    <main className="min-w-0 lg:ml-64">
      <Topbar title={title} subtitle={subtitle} onMenu={()=>setSidebar(true)}/>
      <section className="p-5 md:p-8">{content}</section>
    </main>
    {toast && <Toast {...toast} onClose={()=>setToast(null)}/>}
  </div>;
}

function Login() {
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(e) {
    e.preventDefault(); setError(""); setBusy(true);
    try { await signInWithEmailAndPassword(auth,email,password); }
    catch(err){ setError(err.message.replace("Firebase: ","")); }
    finally{ setBusy(false); }
  }

  return <div className="grid min-h-screen place-items-center bg-slate-950 p-5">
    <div className="w-full max-w-md">
      <div className="mb-7 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-lg font-black text-slate-950">M</div><h1 className="mt-4 text-2xl font-bold tracking-tight text-white">Meat Uploaded</h1><p className="mt-2 text-sm text-slate-400">Private Super Admin content dashboard.</p></div>
      <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-white p-6 shadow-2xl">
        <label className="field-label">Email</label><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="field" placeholder="admin@example.com"/>
        <label className="mt-4 block"><span className="field-label">Password</span><input required type="password" value={password} onChange={e=>setPassword(e.target.value)} className="field" placeholder="••••••••"/></label>
        {error && <div className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700">{error}</div>}
        <button disabled={busy} className="mt-5 w-full rounded-xl bg-slate-950 py-3 text-sm font-bold text-white hover:bg-slate-800">{busy?"Signing in...":"Sign in"}</button>
      </form>
    </div>
  </div>;
}

function Loading(){return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm font-semibold text-slate-400">Loading Meat Uploaded...</div>;}
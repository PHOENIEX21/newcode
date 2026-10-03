"use client";
import { useEffect, useState } from "react";

type PublicState={open:boolean;members:{id:number;full_name:string}[]};

export default function AttendancePage(){
  const [state,setState]=useState<PublicState>({open:false,members:[]});
  const [name,setName]=useState("");
  const [code,setCode]=useState("");
  const [msg,setMsg]=useState<{ok:boolean;text:string}|null>(null);
  const [busy,setBusy]=useState(false);

  useEffect(()=>{fetch("/api/public").then(r=>r.json()).then(setState).catch(()=>setMsg({ok:false,text:"Could not load attendance. Please try again."}))},[]);

  async function submit(e:React.FormEvent){
    e.preventDefault(); setBusy(true); setMsg(null);
    try{
      const r=await fetch("/api/attendance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,code})});
      const data=await r.json();
      setMsg({ok:r.ok,text:data.message||"Something went wrong."});
      if(r.ok){setName("");setCode("")}
    }catch{setMsg({ok:false,text:"Network error. Please try again."})}
    finally{setBusy(false)}
  }

  return <main className="shell">
    <div className="topbar"><div className="brand">Morning Meeting Attendance</div><span className="pill"><span className={"dot "+(state.open?"open":"")}/>{state.open?"Attendance open":"Attendance closed"}</span></div>
    <section className="hero">
      <div className="card">
        <p className="muted small">MORNING REGISTER</p>
        <h1>Mark your presence.</h1>
        <p className="muted">Choose your own name, enter the 4-digit code announced in the room, and submit once.</p>
        <form className="form" onSubmit={submit}>
          <div className="field"><label>Your name</label><input className="input" list="members" value={name} onChange={e=>setName(e.target.value)} placeholder="Start typing your full name" required autoComplete="off"/><datalist id="members">{state.members.map(m=><option key={m.id} value={m.full_name}/>)}</datalist></div>
          <div className="field"><label>Today&apos;s code</label><input className="input" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,4))} inputMode="numeric" pattern="\d{4}" maxLength={4} placeholder="4-digit code" required/></div>
          {msg&&<div className={"notice "+(msg.ok?"ok":"err")}>{msg.text}</div>}
          <button className="button" disabled={busy||!state.open}>{busy?"Submitting…":state.open?"Mark attendance":"Attendance is closed"}</button>
        </form>
      </div>
      <aside className="card">
        <h2>Meeting rules</h2>
        <p className="muted">The code is valid only for the current meeting. Each person marks for themselves.</p>
        <div className="notice ok">No phone? Use the agent&apos;s phone, select your own name, submit, then hand it back.</div>
        <p className="muted small" style={{marginTop:18}}>Your first valid submission is the record for today. Repeated attempts do not create extra attendance.</p>
      </aside>
    </section>
  </main>
}
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login(){
  const [password,setPassword]=useState(""); const [error,setError]=useState(""); const [busy,setBusy]=useState(false); const router=useRouter();
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");const r=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})});if(r.ok){router.push("/admin");router.refresh()}else{setError("Incorrect admin password.")}setBusy(false)}
  return <main className="shell"><div className="login card"><p className="muted small">ADMIN ACCESS</p><h2>Attendance control</h2><p className="muted">Only the attendance administrator should sign in here.</p><form className="form" onSubmit={submit}><div className="field"><label>Password</label><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoFocus/></div>{error&&<div className="notice err">{error}</div>}<button className="button" disabled={busy}>{busy?"Signing in…":"Sign in"}</button></form></div></main>
}
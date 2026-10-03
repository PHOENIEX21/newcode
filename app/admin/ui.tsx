"use client";
import { useEffect, useMemo, useState } from "react";

type Member={
  id:number;full_name:string;active:boolean;days_present:number;days_absent:number;
  late_count:number;total_minutes_late:number;avg_minutes_late:number;attendance_pct:number
};
type DayRow={
  id:number;full_name:string;marked_at:string|null;status:"on_time"|"late"|null;
  cutoff_used:string|null;minutes_late:number|null
};
type Dashboard={
  settings:{current_code:string;is_open:boolean;effective_open:boolean;cutoff_time:string;auto_close_time:string;expired:boolean;reopened:boolean};
  members:Member[];today:DayRow[];selectedDay:DayRow[];selectedDate:string;month:string;date:string
};

export default function AdminClient(){
  const now=new Date();
  const defaultMonth=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const defaultDate=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  const [month,setMonth]=useState(defaultMonth);
  const [selectedDate,setSelectedDate]=useState(defaultDate);
  const [data,setData]=useState<Dashboard|null>(null);
  const [newName,setNewName]=useState("");
  const [code,setCode]=useState("");
  const [cutoff,setCutoff]=useState("07:15");
  const [msg,setMsg]=useState("");
  const [loading,setLoading]=useState(true);
  const [showTodayAbsent,setShowTodayAbsent]=useState(false);
  const [showTodayPresent,setShowTodayPresent]=useState(false);
  const [showHistoryAbsent,setShowHistoryAbsent]=useState(false);
  const [showHistoryPresent,setShowHistoryPresent]=useState(false);
  const [mobileSection,setMobileSection]=useState<"home"|"session"|"today"|"members"|"history"|"monthly"|"export">("home");

  async function load(m=month,d=selectedDate){
    setLoading(true);
    const r=await fetch(`/api/admin/dashboard?month=${encodeURIComponent(m)}&date=${encodeURIComponent(d)}`,{cache:"no-store"});
    if(r.status===401){location.href="/admin/login";return}
    const j=await r.json();
    setData(j);
    setCode(j.settings.current_code);
    setCutoff(String(j.settings.cutoff_time).slice(0,5));
    setLoading(false);
  }

  useEffect(()=>{load(month,selectedDate)},[month,selectedDate]);

  async function settings(patch:Record<string,unknown>){
    setMsg("");
    const r=await fetch("/api/admin/settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(patch)});
    const j=await r.json();
    setMsg(j.message||"Updated.");
    if(r.ok) await load();
  }

  async function addMember(e:React.FormEvent){
    e.preventDefault();
    const r=await fetch("/api/admin/members",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({full_name:newName})});
    const j=await r.json();
    setMsg(j.message);
    if(r.ok){setNewName("");await load()}
  }

  async function toggleMember(id:number,active:boolean){
    const r=await fetch("/api/admin/members",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,active})});
    const j=await r.json();
    setMsg(j.message);
    if(r.ok)await load()
  }

  const present=useMemo(()=>data?.today.filter(x=>x.marked_at)||[],[data]);
  const absent=useMemo(()=>data?.today.filter(x=>!x.marked_at)||[],[data]);
  const late=useMemo(()=>data?.today.filter(x=>x.status==="late")||[],[data]);

  const selectedPresent=useMemo(()=>data?.selectedDay?.filter(x=>x.marked_at)||[],[data]);
  const selectedAbsent=useMemo(()=>data?.selectedDay?.filter(x=>!x.marked_at)||[],[data]);
  const selectedLate=useMemo(()=>data?.selectedDay?.filter(x=>x.status==="late")||[],[data]);


  function openMobileSection(section:"session"|"today"|"members"|"history"|"monthly"|"export",id:string){
    setMobileSection(section);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"});
    }));
  }

  function backToCategories(){
    setMobileSection("home");
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      document.getElementById("admin-categories")?.scrollIntoView({behavior:"smooth",block:"start"});
    }));
  }

  const lateDetail=(x:DayRow)=>{
    if(x.status!=="late") return "";
    if(x.minutes_late==null) return "Late";
    return `${x.minutes_late} min late`;
  };

  return <main className="shell">
    <div className="topbar"><div><div className="brand">Morning Meeting Attendance</div><div className="muted small">Admin dashboard</div></div><form action="/api/admin/logout" method="post"><button className="button secondary">Sign out</button></form></div>
    {msg&&<div className="notice ok" style={{marginBottom:16}}>{msg}</div>}

    <section className="mobile-admin-menu" id="admin-categories">
      <button className="admin-menu-card" onClick={()=>openMobileSection("session","section-session")}><span className="admin-menu-kicker">CONTROL</span><b>Session Control</b><small>Code, cut-off and open/close attendance.</small></button>
      <button className="admin-menu-card" onClick={()=>openMobileSection("today","section-today")}><span className="admin-menu-kicker">TODAY</span><b>Today's Attendance</b><small>See who is present, absent or late today.</small></button>
      <button className="admin-menu-card" onClick={()=>openMobileSection("members","section-members")}><span className="admin-menu-kicker">PEOPLE</span><b>Members</b><small>Add members and manage active status.</small></button>
      <button className="admin-menu-card" onClick={()=>openMobileSection("history","section-history")}><span className="admin-menu-kicker">PAST DAYS</span><b>Daily History</b><small>Choose a date and inspect that day's record.</small></button>
      <button className="admin-menu-card" onClick={()=>openMobileSection("monthly","section-monthly")}><span className="admin-menu-kicker">MONTH</span><b>Monthly Register</b><small>Compare attendance performance across members.</small></button>
      <button className="admin-menu-card" onClick={()=>openMobileSection("export","section-export")}><span className="admin-menu-kicker">RECORDS</span><b>Export</b><small>Download the selected month's CSV record.</small></button>
    </section>

    {mobileSection!=="home"&&<div className="mobile-section-bar"><button className="button secondary" onClick={backToCategories}>← Categories</button></div>}

    <section className={"stats admin-section "+(mobileSection==="home"||mobileSection==="today"?"mobile-show":"mobile-hide")}>
      <div className="stat"><span className="muted small">Present today</span><b>{present.length}</b></div>
      <div className="stat"><span className="muted small">Absent today</span><b>{absent.length}</b></div>
      <div className="stat"><span className="muted small">Late today</span><b>{late.length}</b></div>
      <div className="stat"><span className="muted small">Active members</span><b>{data?.today.length??0}</b></div>
    </section>

    <section className={"grid2 admin-section "+(mobileSection==="session"||mobileSection==="members"?"mobile-show":"mobile-hide")} style={{marginTop:16}}>
      <div id="section-session" className={"card section-anchor "+(mobileSection==="members"?"mobile-inner-hide":"")}>
        <div className="split"><div><p className="muted small">TODAY&apos;S SESSION</p><h2>{data?.settings.effective_open?"Attendance is open":data?.settings.expired?"Attendance expired at 10:00 AM":"Attendance is closed"}</h2></div><span className="pill"><span className={"dot "+(data?.settings.is_open?"open":"")}/>{data?.date||"Today"}</span></div>
        <div className="form">
          <div className="field"><label>4-digit code</label><div className="actions"><input className="input" style={{maxWidth:180}} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,4))} inputMode="numeric"/><button className="button" onClick={()=>settings({code})}>Save code</button><button className="button secondary" onClick={()=>{const c=String(Math.floor(1000+Math.random()*9000));setCode(c);settings({code:c})}}>Generate</button></div></div>
          <div className="field"><label>Approved marking time</label><div className="actions"><input type="time" className="input" style={{maxWidth:180}} value={cutoff} onChange={e=>setCutoff(e.target.value)}/><button className="button secondary" onClick={()=>settings({cutoff})}>Update cut-off</button></div></div>
          <div className="muted small">Automatically locks at {data?.settings.auto_close_time||"10:00"} Lagos time. Admin can reopen it after expiry.</div><div className="actions"><button className="button" onClick={()=>settings({is_open:!data?.settings.effective_open})}>{data?.settings.effective_open?"Close attendance":data?.settings.expired?"Reopen attendance":"Open attendance"}</button></div>
        </div>
      </div>

      <div id="section-members" className={"card section-anchor "+(mobileSection==="session"?"mobile-inner-hide":"")}>
        <p className="muted small">MEMBERS</p><h2>Add a member</h2>
        <form className="form" onSubmit={addMember}><div className="field"><label>Full name</label><input className="input" value={newName} onChange={e=>setNewName(e.target.value)} placeholder="e.g. Musa Ibrahim" required/></div><button className="button">Add to register</button></form>
        <p className="muted small" style={{marginTop:16}}>Names immediately become available on the attendance form.</p>
      </div>
    </section>

    <section id="section-today" className={"card admin-section section-anchor "+(mobileSection==="today"?"mobile-show":"mobile-hide")} style={{marginTop:16}}>
      <div className="split"><div><p className="muted small">DAILY CHECK</p><h2>Today at a glance</h2></div></div>
      <div className="grid2">
        <div><h3>Absent ({absent.length})</h3>{absent.length?<div className="tablewrap"><table className={"absent-table compact-list "+(showTodayAbsent?"expanded":"collapsed")}><tbody>{absent.map(x=><tr key={x.id}><td>{x.full_name}</td><td><span className="tag absent">Absent</span></td></tr>)}</tbody></table></div>:<div className="empty">Nobody absent.</div>}{absent.length>2&&<button className="button secondary mobile-list-toggle" onClick={()=>setShowTodayAbsent(v=>!v)}>{showTodayAbsent?"Close list":`View all (${absent.length})`}</button>}</div>
        <div><h3>Present ({present.length})</h3>{present.length?<div className="tablewrap"><table className={"present-table compact-list "+(showTodayPresent?"expanded":"collapsed")}><thead><tr><th>Name</th><th>Marked</th><th>Cut-off</th><th>Status</th></tr></thead><tbody>{present.map(x=><tr key={x.id}><td>{x.full_name}</td><td>{x.marked_at}</td><td>{x.cutoff_used||String(data?.settings.cutoff_time||"").slice(0,5)}</td><td><span className={"tag "+(x.status==="late"?"late":"present")}>{x.status==="late"?lateDetail(x):"On time"}</span></td></tr>)}</tbody></table></div>:<div className="empty">No one has marked yet.</div>}{present.length>2&&<button className="button secondary mobile-list-toggle" onClick={()=>setShowTodayPresent(v=>!v)}>{showTodayPresent?"Close list":`View all (${present.length})`}</button>}</div>
      </div>
    </section>

    <section id="section-history" className={"card admin-section section-anchor "+(mobileSection==="history"?"mobile-show":"mobile-hide")} style={{marginTop:16}}>
      <div className="split">
        <div><p className="muted small">DAILY HISTORY</p><h2>View attendance by date</h2></div>
        <input type="date" className="input" style={{maxWidth:190}} value={selectedDate} max={data?.date||undefined} onChange={e=>setSelectedDate(e.target.value)}/>
      </div>

      <div className="stats" style={{marginTop:16}}>
        <div className="stat"><span className="muted small">Present</span><b>{selectedPresent.length}</b></div>
        <div className="stat"><span className="muted small">Absent</span><b>{selectedAbsent.length}</b></div>
        <div className="stat"><span className="muted small">Late</span><b>{selectedLate.length}</b></div>
        <div className="stat"><span className="muted small">Date</span><b style={{fontSize:18}}>{data?.selectedDate||selectedDate}</b></div>
      </div>

      <div className="grid2" style={{marginTop:16}}>
        <div>
          <h3>Absent ({selectedAbsent.length})</h3>
          {selectedAbsent.length
            ? <div className="tablewrap"><table className={"absent-table compact-list "+(showHistoryAbsent?"expanded":"collapsed")}><tbody>{selectedAbsent.map(x=><tr key={x.id}><td>{x.full_name}</td><td><span className="tag absent">Absent</span></td></tr>)}</tbody></table></div>
            : <div className="empty">Nobody absent on this date.</div>}
          {selectedAbsent.length>2&&<button className="button secondary mobile-list-toggle" onClick={()=>setShowHistoryAbsent(v=>!v)}>{showHistoryAbsent?"Close list":`View all (${selectedAbsent.length})`}</button>}
        </div>
        <div>
          <h3>Present ({selectedPresent.length})</h3>
          {selectedPresent.length
            ? <div className="tablewrap"><table className={"present-table compact-list "+(showHistoryPresent?"expanded":"collapsed")}><thead><tr><th>Name</th><th>Marked</th><th>Approved time</th><th>Status</th></tr></thead><tbody>{selectedPresent.map(x=><tr key={x.id}><td>{x.full_name}</td><td>{x.marked_at}</td><td>{x.cutoff_used||"—"}</td><td><span className={"tag "+(x.status==="late"?"late":"present")}>{x.status==="late"?lateDetail(x):"On time"}</span></td></tr>)}</tbody></table></div>
            : <div className="empty">Nobody present on this date.</div>}
          {selectedPresent.length>2&&<button className="button secondary mobile-list-toggle" onClick={()=>setShowHistoryPresent(v=>!v)}>{showHistoryPresent?"Close list":`View all (${selectedPresent.length})`}</button>}
        </div>
      </div>
    </section>

    <section id="section-monthly" className={"card admin-section section-anchor "+(mobileSection==="monthly"?"mobile-show":"mobile-hide")} style={{marginTop:16}}>
      <div className="split"><div><p className="muted small">MONTHLY REGISTER</p><h2>Attendance performance</h2></div><input type="month" className="input" style={{maxWidth:190}} value={month} onChange={e=>setMonth(e.target.value)}/></div>
      {loading?<div className="empty">Loading register…</div>:<div className="tablewrap monthly-scroll"><table className="monthly-table"><thead><tr><th>Name</th><th>Present</th><th>Absent</th><th>Late</th><th>Total late mins</th><th>Avg late mins</th><th>Attendance</th><th>Status</th><th></th></tr></thead><tbody>{data?.members.map(m=><tr key={m.id}><td>{m.full_name}</td><td>{m.days_present}</td><td>{m.days_absent}</td><td>{m.late_count}</td><td>{m.total_minutes_late}</td><td>{m.late_count?m.avg_minutes_late:0}</td><td>{m.attendance_pct}%</td><td>{m.active?<span className="tag present">Active</span>:<span className="tag absent">Inactive</span>}</td><td><button className="button secondary" onClick={()=>toggleMember(m.id,!m.active)}>{m.active?"Deactivate":"Reactivate"}</button></td></tr>)}</tbody></table></div>}
    </section>

    <section id="section-export" className={"card admin-section section-anchor "+(mobileSection==="export"?"mobile-show":"mobile-hide")} style={{marginTop:16}}>
      <p className="muted small">EXPORT RECORDS</p>
      <h2>Download monthly attendance</h2>
      <p className="muted">Choose the month, then download the CSV record for reporting or archiving.</p>
      <div className="form">
        <div className="field"><label>Month</label><input type="month" className="input" value={month} onChange={e=>setMonth(e.target.value)}/></div>
        <a className="button" href={`/api/admin/export?month=${month}`}>Download CSV</a>
      </div>
    </section>
  </main>
}
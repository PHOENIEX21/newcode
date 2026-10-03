import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { monthBounds } from "@/lib/time";

function csv(v:unknown){const s=String(v??"");return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}

export async function GET(req:Request){
  if(!(await isAdmin())) return new Response("Unauthorized",{status:401});
  const url=new URL(req.url); const month=url.searchParams.get("month")||new Date().toISOString().slice(0,7); const {start,end}=monthBounds(month); const sql=await db();
  const rows=await sql`
    SELECT m.full_name,a.attendance_date::text,to_char(a.marked_at AT TIME ZONE 'Africa/Lagos','HH12:MI AM') AS marked_time,a.status
    FROM attendance_members m
    JOIN attendance_marks a ON a.member_id=m.id
    WHERE a.attendance_date BETWEEN ${start}::date AND ${end}::date
    ORDER BY a.attendance_date,m.full_name
  `;
  const lines=[["Name","Date","Time","Status"],...rows.map((r:any)=>[r.full_name,r.attendance_date,r.marked_time,r.status])].map(row=>row.map(csv).join(",")).join("\n");
  return new Response(lines,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="attendance-${month}.csv"`}});
}
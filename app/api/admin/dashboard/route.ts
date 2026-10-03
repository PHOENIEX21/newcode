import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { lagosDate, lagosTime, monthBounds } from "@/lib/time";

export const dynamic="force-dynamic";
export async function GET(req:Request){
  if(!(await isAdmin())) return NextResponse.json({message:"Unauthorized"},{status:401});
  try{
    const url=new URL(req.url); const today=lagosDate(); const month=url.searchParams.get("month")||today.slice(0,7); const {start,end,days}=monthBounds(month);
    const sql=await db();
    const settings=(await sql`SELECT current_code,is_open,cutoff_time::text FROM attendance_settings WHERE id=1`)[0];
    const todayRows=await sql`
      SELECT m.id,m.full_name,a.marked_at,a.status
      FROM attendance_members m
      LEFT JOIN attendance_marks a ON a.member_id=m.id AND a.attendance_date=${today}::date
      WHERE m.active=true ORDER BY m.full_name
    `;
    const currentDay=Number(today.slice(-2));
    const elapsed = month===today.slice(0,7) ? Math.min(currentDay,days) : (month<today.slice(0,7)?days:0);
    const memberRows=await sql`
      SELECT m.id,m.full_name,m.active,
        COUNT(a.id)::int AS days_present,
        COUNT(a.id) FILTER (WHERE a.status='late')::int AS late_count
      FROM attendance_members m
      LEFT JOIN attendance_marks a ON a.member_id=m.id AND a.attendance_date BETWEEN ${start}::date AND ${end}::date
      GROUP BY m.id,m.full_name,m.active
      ORDER BY m.active DESC,m.full_name
    `;
    const members=memberRows.map((m:any)=>{
      const p=Number(m.days_present||0); const a=Math.max(0,elapsed-p);
      return {...m,days_present:p,days_absent:a,late_count:Number(m.late_count||0),attendance_pct:elapsed?Math.round((p/elapsed)*100):0}
    });
    const formattedToday=todayRows.map((r:any)=>({...r,marked_at:r.marked_at?lagosTime(r.marked_at):null}));
    return NextResponse.json({settings,today:formattedToday,members,month,date:today});
  }catch(e){console.error(e);return NextResponse.json({message:"Could not load dashboard."},{status:500})}
}
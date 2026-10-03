import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { lagosDate, lagosTime, monthBounds } from "@/lib/time";

export const dynamic="force-dynamic";

function cutoffLabel(value:any){
  return value ? String(value).slice(0,5) : null;
}

export async function GET(req:Request){
  if(!(await isAdmin())) return NextResponse.json({message:"Unauthorized"},{status:401});
  try{
    const url=new URL(req.url);
    const today=lagosDate();
    const month=url.searchParams.get("month")||today.slice(0,7);
    const selectedDate=url.searchParams.get("date")||today;
    const {start,end,days}=monthBounds(month);
    const sql=await db();

    const settings=(await sql`
      SELECT current_code,is_open,cutoff_time::text,auto_close_time::text,reopen_override_date,
        (now() AT TIME ZONE 'Africa/Lagos')::date AS today,
        (now() AT TIME ZONE 'Africa/Lagos')::time AS now_time
      FROM attendance_settings WHERE id=1
    `)[0];
    const reopened=String(settings?.reopen_override_date||"")===String(settings?.today||"");
    const expired=String(settings?.now_time||"00:00:00").slice(0,8)>=String(settings?.auto_close_time||"10:00:00").slice(0,8);
    settings.effective_open=Boolean(settings?.is_open)&&(!expired||reopened);
    settings.expired=expired&&!reopened;
    settings.reopened=reopened;
    settings.auto_close_time=String(settings?.auto_close_time||"10:00:00").slice(0,5);

    const todayRows=await sql`
      SELECT m.id,m.full_name,a.marked_at,a.status,a.cutoff_used::text,a.minutes_late
      FROM attendance_members m
      LEFT JOIN attendance_marks a ON a.member_id=m.id AND a.attendance_date=${today}::date
      WHERE m.active=true ORDER BY m.full_name
    `;

    const selectedRows=await sql`
      SELECT m.id,m.full_name,a.marked_at,a.status,a.cutoff_used::text,a.minutes_late
      FROM attendance_members m
      LEFT JOIN attendance_marks a ON a.member_id=m.id AND a.attendance_date=${selectedDate}::date
      WHERE m.joined_at::date <= ${selectedDate}::date
      ORDER BY m.full_name
    `;

    const currentDay=Number(today.slice(-2));
    const elapsed = month===today.slice(0,7) ? Math.min(currentDay,days) : (month<today.slice(0,7)?days:0);

    const memberRows=await sql`
      SELECT m.id,m.full_name,m.active,
        COUNT(a.id)::int AS days_present,
        COUNT(a.id) FILTER (WHERE a.status='late')::int AS late_count,
        COALESCE(SUM(a.minutes_late) FILTER (WHERE a.status='late'),0)::int AS total_minutes_late,
        COALESCE(ROUND(AVG(a.minutes_late) FILTER (WHERE a.status='late')),0)::int AS avg_minutes_late
      FROM attendance_members m
      LEFT JOIN attendance_marks a ON a.member_id=m.id AND a.attendance_date BETWEEN ${start}::date AND ${end}::date
      GROUP BY m.id,m.full_name,m.active
      ORDER BY m.active DESC,m.full_name
    `;

    const members=memberRows.map((m:any)=>{
      const p=Number(m.days_present||0);
      const a=Math.max(0,elapsed-p);
      return {
        ...m,
        days_present:p,
        days_absent:a,
        late_count:Number(m.late_count||0),
        total_minutes_late:Number(m.total_minutes_late||0),
        avg_minutes_late:Number(m.avg_minutes_late||0),
        attendance_pct:elapsed?Math.round((p/elapsed)*100):0
      };
    });

    const formatRow=(r:any)=>({
      ...r,
      marked_at:r.marked_at?lagosTime(r.marked_at):null,
      cutoff_used:cutoffLabel(r.cutoff_used),
      minutes_late:r.minutes_late==null?null:Number(r.minutes_late)
    });

    return NextResponse.json({
      settings,
      today:todayRows.map(formatRow),
      selectedDay:selectedRows.map(formatRow),
      selectedDate,
      members,
      month,
      date:today
    });
  }catch(e){
    console.error(e);
    return NextResponse.json({message:"Could not load dashboard."},{status:500});
  }
}
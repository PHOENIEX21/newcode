import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic="force-dynamic";
export async function GET(){
  try{
    const sql=await db();
    const settings=await sql`
      SELECT
        is_open,
        auto_close_time::text,
        reopen_override_date,
        code_date,
        session_date,
        (now() AT TIME ZONE 'Africa/Lagos')::date AS today,
        (now() AT TIME ZONE 'Africa/Lagos')::time AS now_time
      FROM attendance_settings WHERE id=1
    `;
    const s=settings[0];
    const todayKey=String(s?.today||"");
    const codeReady=String(s?.code_date||"")===todayKey;
    const sessionToday=String(s?.session_date||"")===todayKey;
    const reopened=String(s?.reopen_override_date||"")===todayKey;
    const beforeAutoClose=String(s?.now_time||"00:00:00").slice(0,8)<String(s?.auto_close_time||"10:00:00").slice(0,8);
    const effectiveOpen=Boolean(s?.is_open)&&codeReady&&sessionToday&&(beforeAutoClose||reopened);
    const members=await sql`SELECT id, full_name FROM attendance_members WHERE active=true ORDER BY full_name`;
    return NextResponse.json({open:effectiveOpen,members,autoClose:String(s?.auto_close_time||"10:00:00").slice(0,5)});
  }catch(e){
    console.error(e);
    return NextResponse.json({open:false,members:[]},{status:500});
  }
}
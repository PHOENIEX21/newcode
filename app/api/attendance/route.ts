import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req:Request){
  try{
    const body=await req.json();
    const name=String(body.name||"").trim();
    const code=String(body.code||"").trim();
    if(!name||!/^\d{4}$/.test(code)) return NextResponse.json({message:"Enter your name and the 4-digit meeting code."},{status:400});

    const sql=await db();
    const settings=await sql`
      SELECT current_code,is_open,cutoff_time::text,auto_close_time::text,reopen_override_date,code_date,session_date,
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
    if(!effectiveOpen) return NextResponse.json({message:"Attendance is closed for today. Ask the admin if it needs to be reopened."},{status:403});
    if(code!==s.current_code) return NextResponse.json({message:"Wrong code. Ask the agent."},{status:403});

    const members=await sql`SELECT id,full_name FROM attendance_members WHERE active=true AND lower(full_name)=lower(${name}) LIMIT 1`;
    if(!members[0]) return NextResponse.json({message:"That name is not on the active register. Ask the admin."},{status:404});

    const local=await sql`
      SELECT
        to_char(now() AT TIME ZONE 'Africa/Lagos','HH24:MI') AS hm,
        GREATEST(
          0,
          FLOOR(EXTRACT(EPOCH FROM (
            (now() AT TIME ZONE 'Africa/Lagos')::time - ${String(s.cutoff_time).slice(0,8)}::time
          )) / 60)
        )::int AS minutes_late
    `;
    const minutesLate=Number(local[0].minutes_late||0);
    const status=minutesLate>0?"late":"on_time";

    const inserted=await sql`
      INSERT INTO attendance_marks(member_id,attendance_date,marked_at,status,cutoff_used,minutes_late)
      VALUES(
        ${members[0].id},
        (now() AT TIME ZONE 'Africa/Lagos')::date,
        now(),
        ${status},
        ${String(s.cutoff_time).slice(0,8)}::time,
        ${minutesLate}
      )
      ON CONFLICT(member_id,attendance_date) DO NOTHING
      RETURNING id
    `;

    if(!inserted[0]){
      return NextResponse.json({message:"You have already marked attendance today."},{status:409});
    }

    return NextResponse.json({
      message:status==="late"
        ? `Attendance marked. You were recorded as ${minutesLate} minute${minutesLate===1?"":"s"} late.`
        :"Attendance marked successfully."
    });
  }catch(e){
    console.error(e);
    return NextResponse.json({message:"Attendance could not be recorded. Please try again."},{status:500});
  }
}
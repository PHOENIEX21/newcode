import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req:Request){
  if(!(await isAdmin())) return NextResponse.json({message:"Unauthorized"},{status:401});
  try{
    const body=await req.json(); const sql=await db();
    if(body.code!==undefined){
      const code=String(body.code);
      if(!/^\d{4}$/.test(code)) return NextResponse.json({message:"Code must be exactly 4 digits."},{status:400});
      await sql`UPDATE attendance_settings SET current_code=${code},code_date=(now() AT TIME ZONE 'Africa/Lagos')::date,updated_at=now() WHERE id=1`;
    }
    if(body.cutoff!==undefined){
      const cutoff=String(body.cutoff);
      if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(cutoff)) return NextResponse.json({message:"Invalid cut-off time."},{status:400});
      await sql`UPDATE attendance_settings SET cutoff_time=${cutoff}::time,updated_at=now() WHERE id=1`;
    }
    if(body.is_open!==undefined){
      const opening=Boolean(body.is_open);
      if(opening){
        const clock=await sql`
          SELECT
            (now() AT TIME ZONE 'Africa/Lagos')::date AS today,
            (now() AT TIME ZONE 'Africa/Lagos')::time AS now_time,
            auto_close_time::text,
            code_date
          FROM attendance_settings WHERE id=1
        `;
        const today=String(clock[0]?.today||"");
        const codeReady=String(clock[0]?.code_date||"")===today;
        if(!codeReady) return NextResponse.json({message:"Generate or save today's 4-digit code before opening attendance."},{status:400});
        const afterAutoClose=String(clock[0]?.now_time||"00:00:00").slice(0,8)>=String(clock[0]?.auto_close_time||"10:00:00").slice(0,8);
        await sql`
          UPDATE attendance_settings
          SET is_open=true,
              session_date=(now() AT TIME ZONE 'Africa/Lagos')::date,
              reopen_override_date=CASE WHEN ${afterAutoClose} THEN (now() AT TIME ZONE 'Africa/Lagos')::date ELSE NULL END,
              updated_at=now()
          WHERE id=1
        `;
        await sql`
          INSERT INTO attendance_sessions(attendance_date,opened_at,cutoff_used,code_used,last_opened_at,manually_closed_at)
          SELECT
            (now() AT TIME ZONE 'Africa/Lagos')::date,
            now(),
            cutoff_time,
            current_code,
            now(),
            NULL
          FROM attendance_settings WHERE id=1
          ON CONFLICT(attendance_date) DO UPDATE
          SET last_opened_at=now(),
              cutoff_used=EXCLUDED.cutoff_used,
              code_used=EXCLUDED.code_used,
              manually_closed_at=NULL
        `;
      }else{
        await sql`
          UPDATE attendance_settings
          SET is_open=false,reopen_override_date=NULL,updated_at=now()
          WHERE id=1
        `;
        await sql`
          UPDATE attendance_sessions
          SET manually_closed_at=now()
          WHERE attendance_date=(now() AT TIME ZONE 'Africa/Lagos')::date
        `;
      }
    }
    if(body.code!==undefined) return NextResponse.json({message:`Today's code ${String(body.code)} is saved. Attendance remains ${body.is_open===true?"open":"unchanged"} until you use the session control.`});
    if(body.cutoff!==undefined) return NextResponse.json({message:"Approved marking time updated."});
    if(body.is_open===true) return NextResponse.json({message:"Today's attendance is now OPEN."});
    if(body.is_open===false) return NextResponse.json({message:"Attendance is now CLOSED."});
    return NextResponse.json({message:"Settings updated."});
  }catch(e){console.error(e);return NextResponse.json({message:"Could not update settings."},{status:500})}
}
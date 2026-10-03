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
      await sql`UPDATE attendance_settings SET current_code=${code},updated_at=now() WHERE id=1`;
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
            auto_close_time::text
          FROM attendance_settings WHERE id=1
        `;
        const afterAutoClose=String(clock[0]?.now_time||"00:00:00").slice(0,8)>=String(clock[0]?.auto_close_time||"10:00:00").slice(0,8);
        await sql`
          UPDATE attendance_settings
          SET is_open=true,
              reopen_override_date=CASE WHEN ${afterAutoClose} THEN (now() AT TIME ZONE 'Africa/Lagos')::date ELSE NULL END,
              updated_at=now()
          WHERE id=1
        `;
      }else{
        await sql`
          UPDATE attendance_settings
          SET is_open=false,reopen_override_date=NULL,updated_at=now()
          WHERE id=1
        `;
      }
    }
    return NextResponse.json({message:"Settings updated."});
  }catch(e){console.error(e);return NextResponse.json({message:"Could not update settings."},{status:500})}
}
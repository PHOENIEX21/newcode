import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req:Request){
  try{
    const body=await req.json();
    const name=String(body.name||"").trim();
    const code=String(body.code||"").trim();
    if(!name||!/^\d{4}$/.test(code)) return NextResponse.json({message:"Enter your name and the 4-digit meeting code."},{status:400});

    const sql=await db();
    const settings=await sql`SELECT current_code,is_open,cutoff_time::text FROM attendance_settings WHERE id=1`;
    const s=settings[0];
    if(!s?.is_open) return NextResponse.json({message:"Attendance is closed. Ask the agent if you have just arrived."},{status:403});
    if(code!==s.current_code) return NextResponse.json({message:"Wrong code. Ask the agent."},{status:403});

    const members=await sql`SELECT id,full_name FROM attendance_members WHERE active=true AND lower(full_name)=lower(${name}) LIMIT 1`;
    if(!members[0]) return NextResponse.json({message:"That name is not on the active register. Ask the admin."},{status:404});

    const nowLocal=await sql`SELECT to_char(now() AT TIME ZONE 'Africa/Lagos','HH24:MI') AS hm`;
    const status=String(nowLocal[0].hm)>String(s.cutoff_time).slice(0,5)?"late":"on_time";

    const inserted=await sql`
      INSERT INTO attendance_marks(member_id,attendance_date,marked_at,status)
      VALUES(${members[0].id},(now() AT TIME ZONE 'Africa/Lagos')::date,now(),${status})
      ON CONFLICT(member_id,attendance_date) DO NOTHING
      RETURNING id
    `;

    if(!inserted[0]){
      return NextResponse.json({message:"You have already marked attendance today."},{status:409});
    }

    return NextResponse.json({message:status==="late"?"Attendance marked. You were recorded as late.":"Attendance marked successfully."});
  }catch(e){
    console.error(e);
    return NextResponse.json({message:"Attendance could not be recorded. Please try again."},{status:500});
  }
}
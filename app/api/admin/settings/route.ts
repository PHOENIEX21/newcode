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
      await sql`UPDATE attendance_settings SET is_open=${Boolean(body.is_open)},updated_at=now() WHERE id=1`;
    }
    return NextResponse.json({message:"Settings updated."});
  }catch(e){console.error(e);return NextResponse.json({message:"Could not update settings."},{status:500})}
}
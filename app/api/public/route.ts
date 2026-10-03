import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic="force-dynamic";
export async function GET(){
  try{
    const sql=await db();
    const settings=await sql`SELECT is_open FROM attendance_settings WHERE id=1`;
    const members=await sql`SELECT id, full_name FROM attendance_members WHERE active=true ORDER BY full_name`;
    return NextResponse.json({open:Boolean(settings[0]?.is_open),members});
  }catch(e){
    console.error(e);
    return NextResponse.json({open:false,members:[]},{status:500});
  }
}
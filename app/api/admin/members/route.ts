import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req:Request){
  if(!(await isAdmin())) return NextResponse.json({message:"Unauthorized"},{status:401});
  const {full_name}=await req.json(); const name=String(full_name||"").trim().replace(/\s+/g," ");
  if(name.length<3) return NextResponse.json({message:"Enter the member's full name."},{status:400});
  try{const sql=await db();await sql`INSERT INTO attendance_members(full_name,active) VALUES(${name},true) ON CONFLICT(full_name) DO UPDATE SET active=true`;return NextResponse.json({message:`${name} added to the register.`})}
  catch(e){console.error(e);return NextResponse.json({message:"Could not add member."},{status:500})}
}
export async function PATCH(req:Request){
  if(!(await isAdmin())) return NextResponse.json({message:"Unauthorized"},{status:401});
  const {id,active}=await req.json();
  if(!Number.isInteger(Number(id))) return NextResponse.json({message:"Invalid member."},{status:400});
  try{const sql=await db();await sql`UPDATE attendance_members SET active=${Boolean(active)} WHERE id=${Number(id)}`;return NextResponse.json({message:active?"Member reactivated.":"Member deactivated."})}
  catch(e){console.error(e);return NextResponse.json({message:"Could not update member."},{status:500})}
}
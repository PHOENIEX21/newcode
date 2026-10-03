import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req:Request){
  if(!(await isAdmin())) return NextResponse.json({message:"Unauthorized"},{status:401});
  const {full_name}=await req.json();
  const name=String(full_name||"").trim().replace(/\s+/g," ");
  if(name.length<3) return NextResponse.json({message:"Enter the member's full name."},{status:400});
  try{
    const sql=await db();
    const rows=await sql`
      INSERT INTO attendance_members(full_name,active)
      VALUES(${name},true)
      ON CONFLICT(full_name) DO UPDATE SET active=true
      RETURNING id
    `;
    const memberId=Number(rows[0].id);
    await sql`
      INSERT INTO attendance_member_periods(member_id,active_from,inactive_from)
      SELECT ${memberId},(now() AT TIME ZONE 'Africa/Lagos')::date,NULL
      WHERE NOT EXISTS (
        SELECT 1 FROM attendance_member_periods
        WHERE member_id=${memberId} AND inactive_from IS NULL
      )
    `;
    return NextResponse.json({message:`${name} added to the register.`});
  }catch(e){
    console.error(e);
    return NextResponse.json({message:"Could not add member."},{status:500});
  }
}

export async function PATCH(req:Request){
  if(!(await isAdmin())) return NextResponse.json({message:"Unauthorized"},{status:401});
  const {id,active}=await req.json();
  const memberId=Number(id);
  if(!Number.isInteger(memberId)) return NextResponse.json({message:"Invalid member."},{status:400});
  try{
    const sql=await db();
    const nextActive=Boolean(active);
    await sql`UPDATE attendance_members SET active=${nextActive} WHERE id=${memberId}`;
    if(nextActive){
      await sql`
        INSERT INTO attendance_member_periods(member_id,active_from,inactive_from)
        SELECT ${memberId},(now() AT TIME ZONE 'Africa/Lagos')::date,NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM attendance_member_periods
          WHERE member_id=${memberId} AND inactive_from IS NULL
        )
      `;
    }else{
      await sql`
        UPDATE attendance_member_periods
        SET inactive_from=(now() AT TIME ZONE 'Africa/Lagos')::date
        WHERE member_id=${memberId} AND inactive_from IS NULL
      `;
    }
    return NextResponse.json({message:nextActive?"Member reactivated.":"Member deactivated."});
  }catch(e){
    console.error(e);
    return NextResponse.json({message:"Could not update member."},{status:500});
  }
}
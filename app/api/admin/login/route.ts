import { NextResponse } from "next/server";
import { adminCookieName, makeAdminToken, verifyAdminPassword } from "@/lib/auth";

export async function POST(req:Request){
  const {password}=await req.json().catch(()=>({password:""}));
  if(!verifyAdminPassword(String(password||""))) return NextResponse.json({ok:false},{status:401});
  const res=NextResponse.json({ok:true});
  res.cookies.set(adminCookieName,makeAdminToken(),{httpOnly:true,sameSite:"strict",secure:process.env.NODE_ENV==="production",path:"/",maxAge:60*60*24*7});
  return res;
}

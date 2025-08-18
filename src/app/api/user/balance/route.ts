
import { NextResponse } from "next/server";

export async function GET() {
  // ⚡️ 后面这里会换成数据库查询
  const balance = 1234.56; 
  return NextResponse.json({ balance });
}

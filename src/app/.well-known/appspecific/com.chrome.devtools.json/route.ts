import { NextResponse } from 'next/server';

export function GET() {
  // ส่ง 204 เปล่า ๆ ปิด 404 noise จาก Chrome devtools
  return new NextResponse(null, { status: 204 });
}
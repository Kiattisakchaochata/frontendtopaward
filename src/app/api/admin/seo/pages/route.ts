import { NextResponse } from 'next/server';

export async function GET() {
  // TODO: ดึงจาก DB จริง
  // โครงต้องเป็น { pages: PageSeo[] }
  return NextResponse.json({ pages: [] });
}
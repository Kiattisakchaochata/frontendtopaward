import { NextResponse } from 'next/server';

export async function DELETE() {
  // TODO: ลบจาก DB จริง
  return NextResponse.json({ ok: true });
}
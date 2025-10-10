import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json(); // { id?, path, title, ... }
  // TODO: เขียนลง DB จริง
  return NextResponse.json({ ok: true });
}
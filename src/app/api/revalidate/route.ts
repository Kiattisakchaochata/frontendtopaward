import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    // รองรับทั้ง { tag: "x" } และ { tags: ["a","b"] }
    const tags: string[] = Array.isArray(body?.tags)
      ? body.tags
      : body?.tag
      ? [body.tag]
      : [];

    if (!tags.length) {
      return NextResponse.json({ ok: false, error: "missing tags" }, { status: 400 });
    }

    const uniq = [...new Set(tags.filter(Boolean))];
    uniq.forEach((t) => revalidateTag(t));

    return NextResponse.json({ ok: true, revalidated: uniq });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "revalidate failed" }, { status: 500 });
  }
}
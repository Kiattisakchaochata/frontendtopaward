export async function getReviewStats(apiBase: string, storeId: string) {
  try {
    const r = await fetch(`${apiBase}/reviews/stores/${encodeURIComponent(storeId)}/reviews`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-store" },
    });
    const j = await r.json().catch(() => ({}));

    const reviews: Array<{ rating?: number }> =
      (Array.isArray(j?.reviews) && j.reviews) ||
      (Array.isArray(j) && j) ||
      [];

    const nums = reviews
      .map((x) => Number(x?.rating || 0))
      .filter((n) => Number.isFinite(n) && n > 0);

    const count = nums.length;
    const avg = count ? Number((nums.reduce((a, b) => a + b, 0) / count).toFixed(1)) : 0;

    return { avg, count };
  } catch {
    return { avg: 0, count: 0 };
  }
}
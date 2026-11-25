import { store, html, verify, esc } from "./_lib.mjs";

export const config = { path: "/api/approve" };

export default async (req) => {
  const url = new URL(req.url);
  const db = store();

  if (req.method === "POST") {
    const form = await req.formData();
    const id = String(form.get("id") || "");
    const sig = String(form.get("sig") || "");
    if (!verify(id, sig)) return html("<h2>❌ Imzo noto'g'ri</h2>", 403);
    const rec = await db.get(id, { type: "json" });
    if (!rec) return html("<h2>Topilmadi</h2>", 404);
    if (rec.status !== "pending") return html(`<h2>Allaqachon: ${esc(rec.status)}</h2>`);
    rec.status = "approved";
    rec.approvedAt = new Date().toISOString();
    await db.setJSON(id, rec);
    return html(`<h2>✅ Tasdiqlandi</h2><p>${esc(rec.nickname)} ga ${rec.coins} Coin tushadi.</p>`);
  }

  // GET: faqat tasdiqlash sahifasini ko'rsatadi (Gmail havolani oldindan ochsa ham Coin tushmaydi)
  const id = url.searchParams.get("id") || "";
  const sig = url.searchParams.get("sig") || "";
  if (!verify(id, sig)) return html("<h2>❌ Imzo noto'g'ri</h2>", 403);
  const rec = await db.get(id, { type: "json" });
  if (!rec) return html("<h2>Topilmadi</h2>", 404);
  if (rec.status !== "pending") return html(`<h2>Allaqachon: ${esc(rec.status)}</h2>`);

  return html(`<h2>Donatni tasdiqlaysizmi?</h2>
    <p><b>${esc(rec.nickname)}</b> (${esc(rec.email)})<br>${rec.amount.toLocaleString("ru-RU")} so'm → ${rec.coins} Coin</p>
    <p>Pul kartangizga tushganini tekshirdingizmi?</p>
    <form method="post" action="/api/approve">
      <input type="hidden" name="id" value="${esc(id)}"><input type="hidden" name="sig" value="${esc(sig)}">
      <button style="background:#16a34a;color:#fff;border:0;padding:14px 22px;border-radius:8px;font-size:16px">✅ Ha, tasdiqlash</button>
    </form>`);
};

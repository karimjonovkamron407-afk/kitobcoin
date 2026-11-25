import { randomUUID } from "node:crypto";
import { store, json, sign, esc, COIN_SOM } from "./_lib.mjs";

export const config = { path: "/api/donate" };

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Faqat POST" }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ error: "Noto'g'ri so'rov" }, 400); }

  const uid = String(body.uid || "").slice(0, 60);
  const nickname = String(body.nickname || "").slice(0, 40);
  const email = String(body.email || "").slice(0, 100);
  const amount = Number(body.amount);

  if (!/^u_[a-z0-9]+$/i.test(uid)) return json({ error: "Akkaunt aniqlanmadi" }, 400);
  if (!Number.isInteger(amount) || amount < COIN_SOM || amount % COIN_SOM !== 0 || amount > 5_000_000)
    return json({ error: "Summa 500 so'mga karrali bo'lsin" }, 400);

  const db = store();
  const { blobs } = await db.list({ prefix: "d_" });
  let pending = 0;
  for (const b of blobs) {
    const d = await db.get(b.key, { type: "json" });
    if (d && d.uid === uid && d.status === "pending") pending++;
  }
  if (pending >= 3) return json({ error: "Kutilayotgan so'rovlar ko'p (3 ta). Tasdiqlanishini kuting." }, 429);

  const id = "d_" + randomUUID();
  const rec = { id, uid, nickname, email, amount, coins: amount / COIN_SOM, status: "pending", createdAt: new Date().toISOString() };
  await db.setJSON(id, rec);

  const origin = new URL(req.url).origin;
  const link = `${origin}/api/approve?id=${encodeURIComponent(id)}&sig=${sign(id)}`;

  const mail = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "KitobCoin <onboarding@resend.dev>",
      to: [process.env.ADMIN_EMAIL],
      subject: `KitobCoin donat: ${amount} so'm (${rec.coins} Coin)`,
      html: `<p><b>${esc(nickname)}</b> (${esc(email)}) ${amount.toLocaleString("ru-RU")} so'm to'ladim dedi.</p>
             <p>Coin: <b>${rec.coins}</b></p>
             <p>Kartangizga pul tushganini tekshiring, keyin:</p>
             <p><a href="${link}" style="background:#16a34a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">✅ Tasdiqlash</a></p>
             <p style="color:#888;font-size:12px">Pul tushmagan bo'lsa, bu xatni e'tiborsiz qoldiring.</p>`
    })
  });
  if (!mail.ok) {
    await db.delete(id);
    return json({ error: "Xat yuborilmadi, keyinroq urinib ko'ring" }, 502);
  }
  return json({ ok: true });
};

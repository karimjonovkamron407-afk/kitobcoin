import { store, json } from "./_lib.mjs";

export const config = { path: "/api/claim" };

export default async (req) => {
  const uid = new URL(req.url).searchParams.get("uid") || "";
  if (!/^u_[a-z0-9]+$/i.test(uid)) return json({ coins: 0 });

  const db = store();
  const { blobs } = await db.list({ prefix: "d_" });
  let coins = 0;
  for (const b of blobs) {
    const d = await db.get(b.key, { type: "json" });
    if (d && d.uid === uid && d.status === "approved") {
      d.status = "claimed";
      d.claimedAt = new Date().toISOString();
      await db.setJSON(b.key, d);
      coins += d.coins;
    }
  }
  return json({ coins });
};

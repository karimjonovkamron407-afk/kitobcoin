import { createHmac, timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";

export const COIN_SOM = 500;

export const store = () => getStore("donations");

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

export function html(body, status = 200) {
  return new Response(
    `<!doctype html><html lang="uz"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<body style="font-family:system-ui;max-width:480px;margin:40px auto;padding:0 16px;line-height:1.5">${body}</body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
  );
}

export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function sign(id) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) throw new Error("ADMIN_SECRET o'rnatilmagan");
  return createHmac("sha256", secret).update(String(id)).digest("hex");
}

export function verify(id, sig) {
  try {
    const a = Buffer.from(sign(id));
    const b = Buffer.from(String(sig || ""));
    return a.length === b.length && timingSafeEqual(a, b);
  } catch { return false; }
}

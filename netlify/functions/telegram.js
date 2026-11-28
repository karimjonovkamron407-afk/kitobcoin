export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { statusCode: 503, body: JSON.stringify({ error: "TELEGRAM_BOT_TOKEN is not configured" }) };
  }
  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }
  const chatId = process.env.TELEGRAM_CHAT_ID || String(body.chatId || "-1005974274519");
  const text = String(body.text || "").slice(0, 3500);
  const imageDataUrl = typeof body.imageDataUrl === "string" ? body.imageDataUrl : "";

  if (!text) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing text" }) };
  }

  try {
    if (imageDataUrl.startsWith("data:image/")) {
      const m = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (m) {
        const mime = m[1];
        const buf = Buffer.from(m[2], "base64");
        if (buf.length > 0 && buf.length < 9 * 1024 * 1024) {
          const fd = new FormData();
          fd.append("chat_id", chatId);
          fd.append("caption", text.slice(0, 1000));
          fd.append("photo", new Blob([buf], { type: mime }), "book.jpg");
          const r = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: "POST",
            body: fd,
          });
          if (r.ok) {
            return { statusCode: 200, body: JSON.stringify({ ok: true }) };
          }
        }
      }
    }

    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    const data = await r.json().catch(() => ({}));
    return { statusCode: r.ok ? 200 : 502, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
}

// api/chat.js
// openrouter-api — unrestricted proxy, free models

const MODELS = [
  "deepseek/deepseek-chat-v3.1:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen3-235b-a22b:free",
  "google/gemini-2.0-flash-exp:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
];

async function callOpenRouter(messages, model, stream) {
  const key = process.env.OPENROUTER_KEY;
  if (!key) throw new Error("OPENROUTER_KEY not set");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.SITE_URL || "https://localhost",
      "X-Title": process.env.SITE_NAME || "openrouter-api",
    },
    body: JSON.stringify({ model, messages, stream }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${model} ${res.status}: ${t}`);
  }
  return res;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); }
    catch { return res.status(400).json({ error: "invalid json" }); }
  }

  const { messages, stream = true, model: forcedModel } = body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages required" });
  }

  const models = forcedModel ? [forcedModel] : MODELS;

  // non-stream
  if (!stream) {
    let lastErr;
    for (const model of models) {
      try {
        const r = await callOpenRouter(messages, model, false);
        const json = await r.json();
        return res.status(200).json({
          model,
          reply: json.choices?.[0]?.message?.content || "",
          raw: json,
        });
      } catch (e) { lastErr = e; }
    }
    return res.status(500).json({ error: lastErr?.message || "all models failed" });
  }

  // stream
  let upstream, usedModel, lastErr;
  for (const model of models) {
    try {
      upstream = await callOpenRouter(messages, model, true);
      usedModel = model;
      break;
    } catch (e) { lastErr = e; }
  }

  if (!upstream) {
    return res.status(500).json({ error: lastErr?.message || "all models failed" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Model", usedModel);

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
  } catch (e) {
    res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
  } finally {
    res.end();
  }
}

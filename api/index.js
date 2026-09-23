// api/index.js
// browser UI for openrouter-api

export default function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>openrouter-api</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, system-ui, sans-serif;
    background: #0a0a0a; color: #e5e5e5; height: 100vh;
    display: flex; flex-direction: column; }
  header { padding: 12px 16px; border-bottom: 1px solid #1f1f1f;
    font-size: 13px; color: #888; letter-spacing: 0.5px; }
  #log { flex: 1; overflow-y: auto; padding: 16px;
    display: flex; flex-direction: column; gap: 12px; }
  .msg { max-width: 80%; padding: 10px 14px; border-radius: 12px;
    font-size: 14px; line-height: 1.5; white-space: pre-wrap;
    word-wrap: break-word; }
  .user { align-self: flex-end; background: #1e3a5f; }
  .bot { align-self: flex-start; background: #1a1a1a; border: 1px solid #222; }
  .err { align-self: flex-start; background: #3a1e1e; color: #ff9d9d; }
  form { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #1f1f1f; }
  textarea { flex: 1; resize: none; background: #111; color: #e5e5e5;
    border: 1px solid #222; border-radius: 10px;
    padding: 10px 12px; font-family: inherit; font-size: 14px;
    outline: none; min-height: 44px; max-height: 200px; }
  textarea:focus { border-color: #333; }
  button { background: #2563eb; color: white; border: 0;
    padding: 0 20px; border-radius: 10px; cursor: pointer;
    font-weight: 500; font-size: 14px; }
  button:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
</head>
<body>
<header>openrouter-api — free models</header>
<div id="log"></div>
<form id="f">
  <textarea id="i" placeholder="type... (enter to send, shift+enter newline)" rows="1"></textarea>
  <button id="b" type="submit">send</button>
</form>
<script>
const log = document.getElementById("log");
const form = document.getElementById("f");
const input = document.getElementById("i");
const btn = document.getElementById("b");
let history = [];

function addMsg(role, text) {
  const el = document.createElement("div");
  el.className = "msg " + role;
  el.textContent = text;
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
  return el;
}

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 200) + "px";
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  input.style.height = "auto";
  btn.disabled = true;

  addMsg("user", text);
  history.push({ role: "user", content: text });

  const botEl = addMsg("bot", "");
  let full = "";

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history, stream: true }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      botEl.className = "msg err";
      botEl.textContent = j.error || ("http " + res.status);
      btn.disabled = false;
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split("\\n\\n");
      buf = parts.pop();
      for (const part of parts) {
        if (!part.startsWith("data: ")) continue;
        const chunk = part.slice(6);
        if (chunk === "[DONE]") continue;
        try {
          const json = JSON.parse(chunk);
          if (json.error) { botEl.className = "msg err"; botEl.textContent = json.error; break; }
          const delta = json.choices?.[0]?.delta?.content || "";
          full += delta;
          botEl.textContent = full;
          log.scrollTop = log.scrollHeight;
        } catch {}
      }
    }
    if (full) history.push({ role: "assistant", content: full });
  } catch (err) {
    botEl.className = "msg err";
    botEl.textContent = "connection error: " + err.message;
  } finally {
    btn.disabled = false;
    input.focus();
  }
});

input.focus();
</script>
</body>
</html>`);
}

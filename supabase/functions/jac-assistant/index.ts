// jac-assistant — server-side AI endpoint for the JAC Assistant chat widget.
// Browser -> this function -> OpenAI-compatible provider (+ read-only JAC Go
// tools) -> browser. The AI key lives only in Edge Function secrets; the
// caller is identified from their verified JWT, never from the request body.
import { createClient } from "npm:@supabase/supabase-js@2";
import { runAgent } from "./agent.ts";
import type { ChatMessage } from "./provider.ts";

const MAX_MESSAGE_CHARS = 1000;
const MAX_HISTORY_MESSAGES = 10;
const MAX_BODY_CHARS = 30_000;
const UNAVAILABLE = "The assistant is temporarily unavailable. Please try again later.";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// Keep only well-formed recent turns, starting with a user turn.
function sanitizeHistory(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const turns: ChatMessage[] = [];
  for (const item of raw.slice(-MAX_HISTORY_MESSAGES)) {
    const role = item?.role;
    const content = item?.content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") continue;
    const text = content.trim().slice(0, MAX_MESSAGE_CHARS);
    if (text) turns.push({ role, content: text });
  }
  while (turns.length && turns[0].role !== "user") turns.shift();
  return turns;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Not authenticated" }, 401);

  // Client acting as the caller: their JWT is forwarded, so RLS applies to
  // every query the tools make.
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: { user }, error: authError } = await db.auth.getUser(token);
  if (authError || !user) return json({ error: "Not authenticated" }, 401);

  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_CHARS * 4) {
    return json({ error: "Request too large" }, 413);
  }

  let body: { message?: unknown; history?: unknown };
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_CHARS) return json({ error: "Request too large" }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) return json({ error: "message is required" }, 400);
  if (message.length > MAX_MESSAGE_CHARS) {
    return json({ error: `message must be at most ${MAX_MESSAGE_CHARS} characters` }, 400);
  }

  const history: ChatMessage[] = [...sanitizeHistory(body.history), { role: "user", content: message }];

  try {
    return json({ reply: await runAgent(history, { db, userId: user.id }) });
  } catch (err) {
    console.error("jac-assistant:", err);
    return json({ error: UNAVAILABLE }, 502);
  }
});

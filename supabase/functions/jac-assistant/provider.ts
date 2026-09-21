// provider.ts — the only file that talks to the AI vendor. It speaks the
// OpenAI-compatible Chat Completions protocol, so any compatible provider
// works by changing AI_BASE_URL / AI_API_KEY / AI_MODEL. Knows nothing about
// JAC Go data or tools.

export type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type ToolSpec = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

export class ProviderError extends Error {}

const REQUEST_TIMEOUT_MS = 25_000;
const MAX_OUTPUT_TOKENS = 500;

// Returns the assistant message (text and/or tool_calls).
export async function chatCompletion(
  messages: ChatMessage[],
  tools?: ToolSpec[],
): Promise<{ content: string | null; tool_calls: ToolCall[] }> {
  const apiKey = Deno.env.get("AI_API_KEY");
  const baseUrl = Deno.env.get("AI_BASE_URL")?.trim().replace(/\/+$/, "");
  const model = Deno.env.get("AI_MODEL");
  if (!apiKey || !baseUrl || !model) {
    throw new ProviderError("AI_API_KEY, AI_BASE_URL and AI_MODEL must all be set");
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      body: JSON.stringify({
        model,
        messages,
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.3,
        ...(tools?.length ? { tools, tool_choice: "auto" } : {}),
      }),
    });
  } catch (err) {
    throw new ProviderError(`Provider request failed: ${(err as Error).message}`);
  }

  if (!res.ok) throw new ProviderError(`Provider ${res.status}: ${(await res.text()).slice(0, 300)}`);

  let data;
  try {
    data = await res.json();
  } catch {
    throw new ProviderError("Provider returned invalid JSON");
  }
  const msg = data?.choices?.[0]?.message;
  if (!msg) throw new ProviderError("Provider response had no message");

  return {
    content: typeof msg.content === "string" ? msg.content : null,
    tool_calls: Array.isArray(msg.tool_calls) ? msg.tool_calls : [],
  };
}

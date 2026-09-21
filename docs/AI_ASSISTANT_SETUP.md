# JAC Assistant — setup

## Architecture

```
chat widget (js/chatbot.js)
  -> supabaseClient.functions.invoke("jac-assistant", { message, history })
  -> Edge Function: verifies the user's JWT, validates/limits input
  -> agent loop (max 3 tool rounds) <-> OpenAI-compatible provider
  -> read-only tools query Postgres as the signed-in user (RLS applies)
  -> { "reply": "..." }
```

The AI key exists only in Edge Function secrets. The browser never sees it.

## Files

- `supabase/functions/jac-assistant/index.ts` — HTTP, CORS, auth, validation
- `.../agent.ts` — system prompt and bounded tool loop
- `.../provider.ts` — the only code that talks to the AI vendor (`{AI_BASE_URL}/chat/completions`)
- `.../tools.ts` — the read-only tools
- `js/chatbot.js`, `js/lang.js`, `css/chatbot.css` — existing widget, now wired to the function

## Tools (all read-only)

| Tool | Table(s) | Scope |
|---|---|---|
| `search_fares` | `fares` | public |
| `search_terminals` | `terminals` | public |
| `search_accommodations` | `accommodation` | public |
| `get_upcoming_trips` | `trips` | own rows only |
| `get_reward_status` | `profiles`, `rewards` | own tier/points + public catalog |
| `track_padala` | `padala_history` | own rows only; **status only** |

Limitations: there is no live bus/cargo location or schedule table, so the assistant cannot report either. `pois` is not exposed yet.

## Environment variables

| Name | Example |
|---|---|
| `AI_API_KEY` | your provider's key |
| `AI_BASE_URL` | provider's OpenAI-compatible base URL, e.g. `https://<provider>/v1` (no `/chat/completions`) |
| `AI_MODEL` | a model that supports tool/function calling |

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected automatically.

## Set secrets and deploy

```
supabase link --project-ref <your-project-ref>
supabase secrets set AI_API_KEY=... AI_BASE_URL=... AI_MODEL=...
supabase functions deploy jac-assistant
```

## Run locally

Create `supabase/.env.local` (gitignored) with the three variables, then:

```
supabase start
supabase functions serve jac-assistant --env-file supabase/.env.local
```

## Test

In the app, log in, open the chat bubble and try:
"How much is Cubao to Lucena?", "What trips do I have?", "How many points do I have?", "Where can I stay near Lucena?".

Or with curl, using a logged-in user's access token (not the anon key):

```
curl -i -X POST https://<project-ref>.supabase.co/functions/v1/jac-assistant \
  -H "Authorization: Bearer <user-access-token>" -H "Content-Type: application/json" \
  -d '{"message":"How much is Cubao to Lucena?"}'
```

Expect `{"reply":"..."}`; no/invalid token gives `401`; provider trouble gives `502` with a friendly message.

## Changing providers

Change only the three secrets; no code change or redeploy is needed. If a provider's tool-calling differs from OpenAI's, adapt `provider.ts` only.

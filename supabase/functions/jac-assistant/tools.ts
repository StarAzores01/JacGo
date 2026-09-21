// tools.ts — the fixed, read-only set of JAC Go data lookups the model may call.
// Every tool is a hard-coded query on a known table; the model only supplies
// short search terms. Personal tools use a Supabase client carrying the
// caller's own JWT (so RLS applies) and also filter on the user id taken from
// the verified token — never from model or browser input.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { ToolSpec } from "./provider.ts";

export type ToolContext = { db: SupabaseClient; userId: string };

type Tool = {
  spec: ToolSpec["function"];
  run: (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;
};

const KLASSES = ["Ordinary", "Deluxe", "Combo"];

// Search terms end up inside PostgREST filters, so keep only letters, digits,
// spaces, hyphens and dots (drops , ( ) % * and quotes).
function term(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.replace(/[^\p{L}\p{N} .\-]/gu, "").trim().slice(0, 40);
}

function fail(scope: string, error: { message: string }): never {
  console.error(`tool ${scope}:`, error.message);
  throw new Error("Database lookup failed");
}

const str = (description: string) => ({ type: "string", description });

const tools: Tool[] = [
  {
    spec: {
      name: "search_fares",
      description: "Look up JAC Go bus fares. Routes are stored like 'Pasay – Lucena'. Omit args to list some fares.",
      parameters: {
        type: "object",
        properties: {
          origin: str("Origin place, e.g. Cubao"),
          destination: str("Destination place, e.g. Lucena"),
          class: { type: "string", enum: KLASSES },
        },
      },
    },
    async run(args, { db }) {
      let q = db.from("fares").select("route, klass, duration, price").order("route").limit(10);
      const origin = term(args.origin);
      const destination = term(args.destination);
      if (origin) q = q.ilike("route", `%${origin}%`);
      if (destination) q = q.ilike("route", `%${destination}%`);
      if (typeof args.class === "string" && KLASSES.includes(args.class)) q = q.eq("klass", args.class);
      const { data, error } = await q;
      if (error) fail("search_fares", error);
      return { currency: "PHP", fares: data };
    },
  },
  {
    spec: {
      name: "search_terminals",
      description: "Find JAC Go terminals by name or address/city. Omit query to list terminals.",
      parameters: { type: "object", properties: { query: str("Place or terminal name, e.g. Lucena") } },
    },
    async run(args, { db }) {
      let q = db.from("terminals").select("name, address, tags").order("name").limit(6);
      const s = term(args.query);
      if (s) q = q.or(`name.ilike.%${s}%,address.ilike.%${s}%`);
      const { data, error } = await q;
      if (error) fail("search_terminals", error);
      return { terminals: data };
    },
  },
  {
    spec: {
      name: "search_accommodations",
      description: "Find hotels/accommodation near a place (matches name, location text, or province).",
      parameters: { type: "object", properties: { location: str("Place, e.g. Lucena") } },
    },
    async run(args, { db }) {
      let q = db
        .from("accommodation")
        .select("name, type, location, province, price, rating")
        .order("rating", { ascending: false, nullsFirst: false })
        .limit(8);
      const s = term(args.location);
      if (s) q = q.or(`name.ilike.%${s}%,location.ilike.%${s}%,province.ilike.%${s}%`);
      const { data, error } = await q;
      if (error) fail("search_accommodations", error);
      return { note: "price is PHP per night; null means unknown", accommodations: data };
    },
  },
  {
    spec: {
      name: "get_upcoming_trips",
      description: "The signed-in user's own upcoming bus trips. Takes no arguments; cannot look up other users.",
      parameters: { type: "object", properties: {} },
    },
    async run(_args, { db, userId }) {
      const { data, error } = await db
        .from("trips")
        .select("code, origin, destination, date, time, gate, seat, klass, fare, status")
        .eq("user_id", userId)
        .eq("status", "upcoming")
        .order("date")
        .order("time")
        .limit(5);
      if (error) fail("get_upcoming_trips", error);
      return { trips: data };
    },
  },
  {
    spec: {
      name: "get_reward_status",
      description: "The signed-in user's own loyalty tier and points balance, plus the rewards catalog. Takes no arguments.",
      parameters: { type: "object", properties: {} },
    },
    async run(_args, { db, userId }) {
      const [profile, catalog] = await Promise.all([
        db.from("profiles").select("tier, points").eq("id", userId).maybeSingle(),
        db.from("rewards").select("title, cost, description").order("cost").limit(10),
      ]);
      if (profile.error) fail("get_reward_status", profile.error);
      if (catalog.error) fail("get_reward_status", catalog.error);
      return { account: profile.data, rewards_catalog: catalog.data };
    },
  },
  {
    spec: {
      name: "track_padala",
      description:
        "Status of the signed-in user's own Padala cargo shipments (status only, no live location). " +
        "Give a code like the one on their receipt, or omit it for their most recent shipments.",
      parameters: { type: "object", properties: { code: str("Padala tracking code") } },
    },
    async run(args, { db, userId }) {
      let q = db
        .from("padala_history")
        .select("code, origin, destination, status, weight_kg, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);
      const code = typeof args.code === "string" ? args.code.trim().toUpperCase().slice(0, 40) : "";
      if (code) q = q.eq("code", code);
      const { data, error } = await q;
      if (error) fail("track_padala", error);
      if (!data?.length) return { shipments: [], note: "No matching shipment found on this account." };
      return { shipments: data };
    },
  },
];

export const toolSpecs: ToolSpec[] = tools.map((t) => ({ type: "function", function: t.spec }));

// Runs one model-requested tool. Never throws: failures come back as an
// error object the model can relay ("data unavailable").
export async function runTool(name: string, rawArgs: string, ctx: ToolContext): Promise<string> {
  const tool = tools.find((t) => t.spec.name === name);
  if (!tool) return JSON.stringify({ error: "Unknown tool" });

  let args: Record<string, unknown> = {};
  try {
    const parsed = rawArgs ? JSON.parse(rawArgs) : {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) args = parsed;
  } catch {
    return JSON.stringify({ error: "Invalid tool arguments" });
  }

  try {
    const out = JSON.stringify(await tool.run(args, ctx));
    // Rows are already capped; this is a last-resort bound that keeps the JSON valid.
    return out.length > 6000 ? JSON.stringify({ error: "Result too large; narrow the search" }) : out;
  } catch {
    return JSON.stringify({ error: "Data is currently unavailable" });
  }
}

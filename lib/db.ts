import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Generation = {
  id: string;
  user_id: string;
  model_id: string;
  endpoint_id: string;
  kind: "image" | "video";
  source: string;
  status: string;
  runpod_job_id: string | null;
  input: Record<string, unknown>;
  output: unknown;
  media_url: string | null;
  cost: number;
  error: string | null;
  created_at: string;
  completed_at: string | null;
};

export type Profile = { user_id: string; email: string | null; credits: number; created_at: string };

export type Stats = {
  requests_7d: number;
  errors_7d: number;
  cost_7d: number;
  daily: { day: string; requests: number; errors: number }[];
  recent_models: string[];
};

let client: SupabaseClient | null = null;

export function dbEnabled() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SWELT_DB_SECRET);
}

function db() {
  if (!dbEnabled()) throw new Error("Supabase is not configured");
  client ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await db().rpc(fn, { p_secret: process.env.SWELT_DB_SECRET, ...args });
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data as T;
}

export const ensureProfile = (user: string, email: string | null, credits: number) =>
  rpc<Profile>("swelt_ensure_profile", { p_user: user, p_email: email, p_credits: credits });

export const addCredits = (user: string, amount: number) => rpc<number>("swelt_add_credits", { p_user: user, p_amount: amount });

export const insertGeneration = (row: Partial<Generation>) => rpc<Generation>("swelt_insert_generation", { p_row: row });

export const setJob = (id: string, job: string, status: string) =>
  rpc<null>("swelt_set_job", { p_id: id, p_job: job, p_status: status });

export const finishGeneration = (
  id: string,
  a: { status: string; output: unknown; media_url: string | null; cost: number; error: string | null; charge: boolean },
) =>
  rpc<Generation>("swelt_finish_generation", {
    p_id: id,
    p_status: a.status,
    p_output: a.output ?? null,
    p_media_url: a.media_url,
    p_cost: a.cost,
    p_error: a.error,
    p_charge: a.charge,
  });

export const getGeneration = async (user: string, id: string) => {
  const g = await rpc<Generation | null>("swelt_get_generation", { p_user: user, p_id: id });
  return g && g.id ? g : null;
};

export const listGenerations = (user: string, limit = 50, kind: string | null = null) =>
  rpc<Generation[]>("swelt_list_generations", { p_user: user, p_limit: limit, p_kind: kind });

export const stats = (user: string) => rpc<Stats>("swelt_stats", { p_user: user });

export const createApiKey = (user: string, name: string, prefix: string, hash: string) =>
  rpc<{ id: string }>("swelt_create_api_key", { p_user: user, p_name: name, p_prefix: prefix, p_hash: hash });

export const listApiKeys = (user: string) =>
  rpc<{ id: string; name: string; prefix: string; created_at: string; last_used_at: string | null }[]>("swelt_list_api_keys", {
    p_user: user,
  });

export const revokeApiKey = (user: string, id: string) => rpc<null>("swelt_revoke_api_key", { p_user: user, p_id: id });

export const resolveApiKey = (hash: string) => rpc<string | null>("swelt_resolve_api_key", { p_hash: hash });

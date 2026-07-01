/* Cloud sync via Supabase — lightweight "family profiles" (no auth).

   Each profile is one row in the `profiles` table holding a JSON blob of the
   user's local data. localStorage stays the on-device working copy; this layer
   pulls a profile's data on open and pushes it (debounced) on change. */
import { createClient } from "@supabase/supabase-js";

// Base project URL (not the /rest/v1/ endpoint) + the public "publishable" key,
// which is designed to be embedded in a web app. Row-level security gates access.
const SUPABASE_URL = "https://wpzsmlesvquovxmkxkfl.supabase.co";
const SUPABASE_KEY = "sb_publishable_u7tXyk1lIqg307kilsEVbw_A3tVS6Ad";

// Requests get a hard deadline. Supabase's default fetch has no timeout, so a
// slow/unresponsive backend — e.g. a free-tier project cold-starting after a
// stretch of inactivity — leaves calls hanging forever instead of resolving or
// rejecting. Without this, the UI's loading states never clear. On timeout the
// request aborts and rejects, letting callers fall back to the local copy or
// surface an error.
const REQUEST_TIMEOUT_MS = 8000;

function fetchWithTimeout(input, init = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  // Chain any caller-supplied signal so external aborts still work.
  const outer = init.signal;
  if (outer) {
    if (outer.aborted) controller.abort();
    else outer.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return fetch(input, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(id),
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
  global: { fetch: fetchWithTimeout },
});

// Retry a read a couple of times before giving up. The first request after a
// period of inactivity often eats the backend's wake-up latency and times out;
// a follow-up usually lands once it's warm.
async function withRetry(fn, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

// localStorage keys that belong to a profile (synced). meals:remoteCache is just
// a cache of the shared meals.json, so it's intentionally excluded.
export const SYNC_KEYS = [
  "meals:plan",
  "meals:favorites",
  "meals:custom",
  "meals:cooked",
  "meals:prepDay",
  "meals:shopping:checked",
];

export const PROFILE_KEY = "pp:profile"; // { id, name }

export const normId = (name) => name.trim().toLowerCase();

export function gatherLocalData() {
  const data = {};
  for (const k of SYNC_KEYS) {
    const raw = localStorage.getItem(k);
    if (raw == null) continue;
    try { data[k] = JSON.parse(raw); } catch { /* skip unparseable */ }
  }
  return data;
}

export function applyDataToLocal(data) {
  if (!data || typeof data !== "object") return;
  for (const k of SYNC_KEYS) {
    if (k in data) localStorage.setItem(k, JSON.stringify(data[k]));
  }
}

export function clearLocalData() {
  for (const k of SYNC_KEYS) localStorage.removeItem(k);
}

export async function listProfiles() {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,display_name,updated_at")
      .order("display_name", { ascending: true });
    if (error) throw error;
    return (data || []).map((r) => ({ id: r.id, name: r.display_name, updatedAt: r.updated_at }));
  });
}

export async function loadProfile(id) {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("data")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data?.data || null;
  });
}

export async function saveProfile(id, displayName, dataObj) {
  const { error } = await supabase.from("profiles").upsert({
    id,
    display_name: displayName,
    data: dataObj || {},
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function createProfile(displayName, seedData) {
  const id = normId(displayName);
  await saveProfile(id, displayName, seedData || {});
  return { id, name: displayName };
}

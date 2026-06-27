/* Cloud sync via Supabase — lightweight "family profiles" (no auth).

   Each profile is one row in the `profiles` table holding a JSON blob of the
   user's local data. localStorage stays the on-device working copy; this layer
   pulls a profile's data on open and pushes it (debounced) on change. */
import { createClient } from "@supabase/supabase-js";

// Base project URL (not the /rest/v1/ endpoint) + the public "publishable" key,
// which is designed to be embedded in a web app. Row-level security gates access.
export const SUPABASE_URL = "https://wpzsmlesvquovxmkxkfl.supabase.co";
export const SUPABASE_KEY = "sb_publishable_u7tXyk1lIqg307kilsEVbw_A3tVS6Ad";

// If the (free-tier) project is paused or the network drops, a bare fetch can
// hang for the browser's default timeout (minutes). Cap each request so callers
// fail fast and fall back to the on-device copy instead of blocking the UI.
const REQUEST_TIMEOUT_MS = 8000;

function fetchWithTimeout(input, init = {}) {
  // Respect a caller-supplied signal (e.g. supabase's own .abortSignal()).
  if (init.signal) return fetch(input, init);
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(id),
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
  global: { fetch: fetchWithTimeout },
});

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
  const { data, error } = await supabase
    .from("profiles")
    .select("id,display_name,updated_at")
    .order("display_name", { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => ({ id: r.id, name: r.display_name, updatedAt: r.updated_at }));
}

export async function loadProfile(id) {
  const { data, error } = await supabase
    .from("profiles")
    .select("data")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data?.data || null;
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

/* Week-plan helpers.

   A plan is 7 days, each with a `dinner` and a `flex` meal id (the flex slot holds
   a Breakfast, Lunch, or Snack). The planner now picks a SMALL set of distinct,
   batch-friendly dishes (default 3 dinners + 4 flex) and spreads each across
   several days as leftovers — so the week is built from ~6–7 recipes, not 14. */

import { SERVINGS } from "./seedMeals.js";

export const DAYS = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

export const FLEX_TYPES = ["Breakfast", "Lunch", "Snack"];
export const SLOT_KINDS = ["dinner", "flex"];

export const DEFAULT_CONFIG = { nDinners: 3, nFlex: 4 };

const BATCH_TAGS = new Set([
  "batch", "freezer-friendly", "one-pot", "make-ahead", "no-cook", "hands-off",
]);

export function isBatchy(meal) {
  return !!meal?.tags?.some((t) => BATCH_TAGS.has(t));
}

// How many servings one batch of a recipe yields (with sensible fallbacks).
export function mealServings(meal) {
  if (!meal) return 1;
  if (typeof meal.servings === "number" && meal.servings > 0) return meal.servings;
  if (SERVINGS && SERVINGS[meal.id]) return SERVINGS[meal.id];
  return meal.type === "Dinner" ? 4 : 2;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

export function dinnerPool(meals) {
  return meals.filter((m) => m.type === "Dinner");
}
export function flexPool(meals) {
  return meals.filter((m) => FLEX_TYPES.includes(m.type));
}
export function poolForKind(meals, kind) {
  return kind === "dinner" ? dinnerPool(meals) : flexPool(meals);
}

// Weighted sampling without replacement, biased toward batch-friendly, higher-
// yield dishes (so fewer batches cover the week) while keeping shuffle variety.
function weightedSample(pool, n, weightFn) {
  const items = pool.map((x) => ({ x, w: Math.max(0.01, weightFn(x)) }));
  const out = [];
  const target = Math.min(n, items.length);
  while (out.length < target && items.length) {
    const total = items.reduce((s, it) => s + it.w, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < items.length; idx++) { r -= items[idx].w; if (r <= 0) break; }
    idx = Math.min(idx, items.length - 1);
    out.push(items[idx].x);
    items.splice(idx, 1);
  }
  return out;
}

// Spread picks across `days` as even, contiguous blocks (leftovers run together).
function spread(ids, days) {
  const k = ids.length;
  if (k === 0) return Array(days).fill(null);
  const base = Math.floor(days / k);
  const extra = days % k;
  const seq = [];
  for (let i = 0; i < k; i++) {
    const len = base + (i < extra ? 1 : 0);
    for (let j = 0; j < len; j++) seq.push(ids[i]);
  }
  return seq.slice(0, days);
}

export function buildWeek(meals, config = DEFAULT_CONFIG) {
  const days = DAYS.length;
  const nD = clamp(config.nDinners ?? 3, 1, days);
  const nF = clamp(config.nFlex ?? 4, 1, days);
  const weight = (m) => mealServings(m) + (isBatchy(m) ? 2 : 0);

  const dPicks = weightedSample(dinnerPool(meals), nD, weight).map((m) => m.id);
  const fPicks = weightedSample(flexPool(meals), nF, weight).map((m) => m.id);
  const dSeq = spread(dPicks, days);
  const fSeq = spread(fPicks, days);

  return DAYS.map((_, i) => ({ dinner: dSeq[i] || null, flex: fSeq[i] || null }));
}

export function isValidPlan(plan) {
  return (
    Array.isArray(plan) &&
    plan.length === DAYS.length &&
    plan.every((d) => d && typeof d === "object" && "dinner" in d && "flex" in d)
  );
}

// Which day-slots repeat an earlier day's meal (i.e. are leftovers).
export function leftoverFlags(plan) {
  const flags = plan.map(() => ({ dinner: false, flex: false }));
  for (const kind of SLOT_KINDS) {
    const seen = new Set();
    plan.forEach((d, i) => {
      const id = d[kind];
      if (!id) return;
      if (seen.has(id)) flags[i][kind] = true;
      else seen.add(id);
    });
  }
  return flags;
}

// Distinct dishes per slot kind, in first-appearance order, with coverage info.
export function cookingThisWeek(plan, byId) {
  const summarize = (kind) => {
    const order = [];
    const seen = new Set();
    plan.forEach((d) => {
      const id = d[kind];
      if (id && !seen.has(id)) { seen.add(id); order.push(id); }
    });
    return order.map((id) => {
      const meal = byId.get(id);
      const days = plan.filter((d) => d[kind] === id).length;
      const servings = mealServings(meal);
      const batches = Math.max(1, Math.ceil(days / servings));
      return { id, meal, days, servings, batches };
    }).filter((x) => x.meal);
  };
  return { dinners: summarize("dinner"), flex: summarize("flex") };
}

// Distinct recipes across the whole plan with how many batches to cook (for shopping).
export function planBatches(plan, byId) {
  const count = new Map();
  for (const d of plan) {
    for (const kind of SLOT_KINDS) {
      const id = d[kind];
      if (id) count.set(id, (count.get(id) || 0) + 1);
    }
  }
  const out = [];
  for (const [id, days] of count) {
    const meal = byId.get(id);
    if (!meal) continue;
    out.push({ meal, batches: Math.max(1, Math.ceil(days / mealServings(meal))) });
  }
  return out;
}

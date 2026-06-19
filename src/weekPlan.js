/* Week-plan helpers.

   The plan is a SET of chosen dishes (the source of truth) plus a derived 7-day
   grid arrangement:

     { dinners: [id…], flex: [id…], grid: [{ dinner, flex } × 7] }

   - dinners / flex: ordered, distinct dish ids (≤ 7 each). What you're cooking.
     Drives the shopping list. The `+` stepper / Browse-add prepend to the top.
   - grid: how those dishes spread across the week as leftovers. Re-derived
     whenever the dish set changes; drag-to-swap mutates only the grid. */

import { SERVINGS } from "./seedMeals.js";

export const DAYS = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

export const FLEX_TYPES = ["Breakfast", "Lunch", "Snack"];
export const SLOT_KINDS = ["dinner", "flex"];
export const MAX_PER_KIND = DAYS.length; // 7
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

const weight = (m) => mealServings(m) + (isBatchy(m) ? 2 : 0);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export function dinnerPool(meals) {
  return meals.filter((m) => m.type === "Dinner");
}
export function flexPool(meals) {
  return meals.filter((m) => FLEX_TYPES.includes(m.type));
}
export function poolForKind(meals, kind) {
  return kind === "dinner" ? dinnerPool(meals) : flexPool(meals);
}
export function kindForMeal(meal) {
  return meal && meal.type === "Dinner" ? "dinner" : "flex";
}

// Weighted sampling without replacement, biased toward batch-friendly, higher-
// yield dishes while keeping shuffle variety.
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

// Spread ids across `days` as even, contiguous blocks (leftovers run together).
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

export function spreadGrid(dinners, flex) {
  const d = spread(dinners, DAYS.length);
  const f = spread(flex, DAYS.length);
  return DAYS.map((_, i) => ({ dinner: d[i] || null, flex: f[i] || null }));
}

const listFor = (plan, kind) => (kind === "dinner" ? plan.dinners : plan.flex);

// Return a new plan with one category's dish list replaced; grid re-derived.
function withList(plan, kind, newList) {
  const dinners = kind === "dinner" ? newList : plan.dinners;
  const flex = kind === "flex" ? newList : plan.flex;
  return { dinners, flex, grid: spreadGrid(dinners, flex) };
}

export function emptyPlan() {
  return { dinners: [], flex: [], grid: spreadGrid([], []) };
}

// Family recipes are opt-in (add from Browse / swap them in manually); they're
// kept out of auto-generation and the random "+" so a shuffle stays on-theme.
const autoOk = (m) => !m.family;

export function buildPlan(meals, config = DEFAULT_CONFIG) {
  const nD = clamp(config.nDinners ?? 3, 1, MAX_PER_KIND);
  const nF = clamp(config.nFlex ?? 4, 1, MAX_PER_KIND);
  const dinners = weightedSample(dinnerPool(meals).filter(autoOk), nD, weight).map((m) => m.id);
  const flex = weightedSample(flexPool(meals).filter(autoOk), nF, weight).map((m) => m.id);
  return { dinners, flex, grid: spreadGrid(dinners, flex) };
}

// --- dish-set mutations (each returns a new plan; grid re-derived) ---

export function addRandomDish(plan, meals, kind) {
  const list = listFor(plan, kind);
  if (list.length >= MAX_PER_KIND) return plan;
  const pool = poolForKind(meals, kind).filter((m) => autoOk(m) && !list.includes(m.id));
  if (!pool.length) return plan;
  const pick = weightedSample(pool, 1, weight)[0];
  return withList(plan, kind, [pick.id, ...list]);
}

export function removeTopDish(plan, kind) {
  const list = listFor(plan, kind);
  if (!list.length) return plan;
  return withList(plan, kind, list.slice(1));
}

export function addDishById(plan, meals, id) {
  const meal = meals.find((m) => m.id === id);
  if (!meal) return plan;
  const kind = kindForMeal(meal);
  const list = listFor(plan, kind);
  if (list.includes(id) || list.length >= MAX_PER_KIND) return plan;
  return withList(plan, kind, [id, ...list]);
}

export function removeDishById(plan, id) {
  for (const kind of SLOT_KINDS) {
    const list = listFor(plan, kind);
    if (list.includes(id)) return withList(plan, kind, list.filter((x) => x !== id));
  }
  return plan;
}

export function replaceDishById(plan, oldId, newId) {
  for (const kind of SLOT_KINDS) {
    const list = listFor(plan, kind);
    const idx = list.indexOf(oldId);
    if (idx >= 0) {
      let next;
      if (list.includes(newId)) next = list.filter((x) => x !== oldId); // dedupe
      else { next = [...list]; next[idx] = newId; }
      return withList(plan, kind, next);
    }
  }
  return plan;
}

// Drag-swap: swap which dish sits on two days (same kind). Lists unchanged.
export function swapGridSlots(plan, dayA, dayB, kind) {
  const grid = plan.grid.map((d) => ({ ...d }));
  const tmp = grid[dayA][kind];
  grid[dayA][kind] = grid[dayB][kind];
  grid[dayB][kind] = tmp;
  return { ...plan, grid };
}

export function shufflePlan(meals, plan) {
  const nD = plan?.dinners?.length || DEFAULT_CONFIG.nDinners;
  const nF = plan?.flex?.length || DEFAULT_CONFIG.nFlex;
  return buildPlan(meals, { nDinners: nD, nFlex: nF });
}

export function planHasDish(plan, id) {
  return !!plan && (plan.dinners?.includes(id) || plan.flex?.includes(id));
}
export function isKindFull(plan, kind) {
  return !!plan && listFor(plan, kind).length >= MAX_PER_KIND;
}

export function isValidPlan(plan) {
  return (
    !!plan &&
    Array.isArray(plan.dinners) &&
    Array.isArray(plan.flex) &&
    Array.isArray(plan.grid) &&
    plan.grid.length === DAYS.length
  );
}

// Convert the old per-day grid shape [{dinner,flex}×7] into the new model.
export function migratePlan(old) {
  if (!old) return null;
  if (isValidPlan(old)) return old;
  if (Array.isArray(old) && old.length === DAYS.length) {
    const dinners = [], flex = [], sd = new Set(), sf = new Set();
    for (const d of old) {
      if (d?.dinner && !sd.has(d.dinner)) { sd.add(d.dinner); dinners.push(d.dinner); }
      if (d?.flex && !sf.has(d.flex)) { sf.add(d.flex); flex.push(d.flex); }
    }
    return { dinners, flex, grid: old.map((d) => ({ dinner: d?.dinner || null, flex: d?.flex || null })) };
  }
  return null;
}

// --- derived data for views ---

function gridCounts(grid) {
  const c = { dinner: new Map(), flex: new Map() };
  for (const d of grid) {
    for (const k of SLOT_KINDS) {
      const id = d[k];
      if (id) c[k].set(id, (c[k].get(id) || 0) + 1);
    }
  }
  return c;
}

// Which grid day-slots repeat an earlier day's meal (i.e. are leftovers).
export function leftoverFlags(grid) {
  const flags = grid.map(() => ({ dinner: false, flex: false }));
  for (const kind of SLOT_KINDS) {
    const seen = new Set();
    grid.forEach((d, i) => {
      const id = d[kind];
      if (!id) return;
      if (seen.has(id)) flags[i][kind] = true;
      else seen.add(id);
    });
  }
  return flags;
}

// The editable dish list per kind, in list order, with coverage info.
export function cookingThisWeek(plan, byId) {
  const counts = gridCounts(plan.grid);
  const mk = (kind) => listFor(plan, kind).map((id) => {
    const meal = byId.get(id);
    const days = counts[kind].get(id) || 0;
    const servings = mealServings(meal);
    const batches = Math.max(1, Math.ceil((days || 1) / servings));
    return { id, meal, days, servings, batches, kind };
  }).filter((x) => x.meal);
  return { dinners: mk("dinner"), flex: mk("flex") };
}

// Distinct recipes across the plan with how many batches to cook (for shopping).
export function planBatches(plan, byId) {
  if (!isValidPlan(plan)) return [];
  const counts = gridCounts(plan.grid);
  const out = [];
  for (const kind of SLOT_KINDS) {
    for (const id of listFor(plan, kind)) {
      const meal = byId.get(id);
      if (!meal) continue;
      const days = counts[kind].get(id) || 1;
      out.push({ meal, batches: Math.max(1, Math.ceil(days / mealServings(meal))) });
    }
  }
  return out;
}

import React, { useMemo, useState } from "react";
import { Clock, CalendarDays, UtensilsCrossed, Sun, ChefHat, ChevronDown, Check } from "lucide-react";
import { leftoverFlags, isBatchy, mealServings, cookingThisWeek } from "./weekPlan.js";

// Map local weekday (Sun=0..Sat=6) onto the plan's Monday-start grid (Mon=0..Sun=6).
export function todayIndex(date = new Date()) {
  return (date.getDay() + 6) % 7;
}

export default function Today({ allMeals, plan, cooked = {}, prepDay = 6, onToggleCooked, onViewRecipe, onGoToPlan }) {
  const byId = useMemo(() => {
    const m = new Map();
    for (const meal of allMeals) m.set(meal.id, meal);
    return m;
  }, [allMeals]);

  const idx = todayIndex();
  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });

  const hasPlan = plan && Array.isArray(plan.grid) && plan.grid.length === 7;

  const meals = useMemo(() => {
    if (!hasPlan) return [];
    const slot = plan.grid[idx];
    const lo = leftoverFlags(plan.grid)[idx];
    const out = [];
    const d = byId.get(slot.dinner);
    if (d) out.push({ meal: d, kind: "dinner", leftover: lo.dinner });
    const f = byId.get(slot.flex);
    if (f) out.push({ meal: f, kind: "flex", leftover: lo.flex });
    return out;
  }, [hasPlan, plan, idx, byId]);

  // A meal needs prep today unless it's a batch dish cooked earlier, or you've
  // already marked it cooked/prepped ahead.
  const reheatOnly = (m) => m.leftover && isBatchy(m.meal);
  const prepMeals = meals.filter((m) => !reheatOnly(m) && !cooked[m.meal.id]);

  const batchFor = (meal, kind) => {
    const days = plan.grid.filter((g) => g[kind] === meal.id).length;
    return Math.max(1, Math.ceil(days / mealServings(meal)));
  };

  const tagFor = (m) => {
    if (cooked[m.meal.id]) return { cls: "ready", text: "Prepped · ready" };
    if (!m.leftover) {
      const b = batchFor(m.meal, m.kind);
      return { cls: "fresh", text: b > 1 ? `Cook fresh · ${b} batches` : "Cook fresh" };
    }
    if (isBatchy(m.meal)) return { cls: "left", text: "Leftovers · reheat" };
    return { cls: "again", text: "Make again" };
  };

  const todayIngredients = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const { meal } of prepMeals) {
      for (const ing of meal.ingredients || []) {
        if (ing.trimEnd().endsWith(":")) continue; // section heading, not an ingredient
        const k = ing.trim().toLowerCase();
        if (!seen.has(k)) { seen.add(k); out.push(ing); }
      }
    }
    return out;
  }, [prepMeals]);

  // Prep-day module: on the user's chosen prep day, a cook-ahead checklist of the
  // whole week's dishes appears above the normal Today content.
  const [prepOpen, setPrepOpen] = useState(true);
  const cooking = useMemo(() => (hasPlan ? cookingThisWeek(plan, byId) : { dinners: [], flex: [] }), [hasPlan, plan, byId]);
  const isPrepDay = hasPlan && idx === prepDay;
  const prepDishes = [...cooking.dinners, ...cooking.flex];
  const cookedCount = prepDishes.filter((d) => cooked[d.id]).length;

  return (
    <div className="pp-today">
      <div className="pp-today-head">
        <h2 className="pp-plan-title">Today</h2>
        <p className="pp-fine">{dateLabel}</p>
      </div>

      {isPrepDay && prepDishes.length > 0 && (
        <section className="pp-prep">
          <button className="pp-prep-head" onClick={() => setPrepOpen((v) => !v)} aria-expanded={prepOpen}>
            <span className="pp-prep-title"><ChefHat size={16} strokeWidth={2.2} /> It's your prep day — batch-cook these
              <span className="pp-prep-count">{cookedCount}/{prepDishes.length}</span></span>
            <ChevronDown size={16} className={prepOpen ? "rot" : ""} />
          </button>
          {prepOpen && (
            <div className="pp-prep-list">
              {prepDishes.map((d) => (
                <div key={d.id} className={"pp-prep-item" + (cooked[d.id] ? " cooked" : "")} role="button" tabIndex={0}
                  onClick={() => onViewRecipe(d.meal)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onViewRecipe(d.meal))}
                  title="Tap for the recipe">
                  <button className="pp-cook-check" aria-pressed={!!cooked[d.id]}
                    aria-label={cooked[d.id] ? `Mark ${d.meal.name} not prepped` : `Mark ${d.meal.name} prepped`}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); onToggleCooked && onToggleCooked(d.id); }}>
                    {cooked[d.id] && <Check size={12} strokeWidth={3} />}
                  </button>
                  <span className="pp-prep-text">
                    <span className="pp-prep-name">{d.meal.name}</span>
                    <span className="pp-prep-meta">{d.batches > 1 ? `cook ×${d.batches} · ` : ""}covers {d.days} {d.days === 1 ? "day" : "days"}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {meals.length === 0 ? (
        <div className="pp-empty">
          <Sun size={26} strokeWidth={1.6} />
          <p>Nothing planned for today.</p>
          <p className="pp-fine">Set up your week and today's meals show up here.</p>
          <button className="pp-shuffle" style={{ marginTop: 14 }} onClick={onGoToPlan}>
            <CalendarDays size={15} strokeWidth={2.3} /> Plan your week
          </button>
        </div>
      ) : (
        <>
          <div className="pp-today-meals">
            {meals.map(({ meal, kind, leftover }) => {
              const tag = tagFor({ meal, kind, leftover });
              return (
                <button key={kind} className="pp-today-card" onClick={() => onViewRecipe(meal)}>
                  <div className="pp-today-cardtop">
                    <span className={"pp-type t-" + meal.type.toLowerCase()}>{meal.type}</span>
                    <span className={"pp-today-tag " + tag.cls}>{tag.text}</span>
                  </div>
                  <h3 className="pp-today-name">{meal.name}</h3>
                  <div className="pp-spec">
                    <span><b>{meal.cal}</b> kcal</span>
                    <span><b>{meal.fiber}g</b> fiber</span>
                    <span><b>{meal.protein}g</b> protein</span>
                    <span><Clock size={11} /> {meal.time}m</span>
                  </div>
                  <span className="pp-today-view">View recipe →</span>
                </button>
              );
            })}
          </div>

          <div className="pp-today-prep">
            <h3 className="pp-shop-secname"><UtensilsCrossed size={14} strokeWidth={2.2} /> For today</h3>
            {prepMeals.length === 0 ? (
              <p className="pp-today-rest">Nothing to prep — just reheat and enjoy the leftovers.</p>
            ) : (
              <ul className="pp-today-ing">
                {todayIngredients.map((i, k) => <li key={k}>{i}</li>)}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

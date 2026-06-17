import React, { useMemo } from "react";
import { Check, RotateCcw, CalendarDays, ShoppingBasket } from "lucide-react";
import { buildShoppingList } from "./shoppingList.js";
import { planBatches } from "./weekPlan.js";

export default function Shopping({ allMeals, plan, checked, onToggle, onClear, onPlan }) {
  const byId = useMemo(() => {
    const m = new Map();
    for (const meal of allMeals) m.set(meal.id, meal);
    return m;
  }, [allMeals]);

  // distinct recipes × how many batches to cook (one batch covers `servings` days)
  const entries = useMemo(() => (plan ? planBatches(plan, byId) : []), [plan, byId]);
  const dishCount = entries.length;
  const batchCount = useMemo(() => entries.reduce((n, e) => n + e.batches, 0), [entries]);

  const sections = useMemo(() => buildShoppingList(entries), [entries]);

  const total = useMemo(() => sections.reduce((n, s) => n + s.items.length, 0), [sections]);
  const got = useMemo(
    () => sections.reduce((n, s) => n + s.items.filter((it) => checked[it.key]).length, 0),
    [sections, checked]
  );

  if (!plan || total === 0) {
    return (
      <div className="pp-shop">
        <div className="pp-empty">
          <ShoppingBasket size={26} strokeWidth={1.6} />
          <p>No meals planned yet.</p>
          <p className="pp-fine">Plan a week and your shopping list builds itself.</p>
          <button className="pp-shuffle" style={{ marginTop: 14 }} onClick={onPlan}>
            <CalendarDays size={15} strokeWidth={2.3} /> Plan my week
          </button>
        </div>
      </div>
    );
  }

  const pct = total ? Math.round((got / total) * 100) : 0;

  return (
    <div className="pp-shop">
      <div className="pp-shop-head">
        <div>
          <h2 className="pp-plan-title">Shopping list</h2>
          <p className="pp-fine">
            For {dishCount} {dishCount === 1 ? "dish" : "dishes"} ({batchCount} {batchCount === 1 ? "batch" : "batches"}) across your week. Check off what you have or grab.
          </p>
        </div>
        {got > 0 && (
          <button className="pp-shop-clear" onClick={onClear}>
            <RotateCcw size={13} /> Uncheck all
          </button>
        )}
      </div>

      <div className="pp-shop-progress">
        <div className="pp-shop-bar"><span style={{ width: pct + "%" }} /></div>
        <span className="pp-shop-count">{got} / {total} got</span>
      </div>

      {sections.map((sec) => (
        <section className="pp-shop-section" key={sec.name}>
          <h3 className="pp-shop-secname">{sec.name} <span>{sec.items.length}</span></h3>
          <div className="pp-shop-items">
            {sec.items.map((it) => {
              const on = !!checked[it.key];
              return (
                <button key={it.key}
                  className={"pp-shop-item" + (on ? " checked" : "")}
                  onClick={() => onToggle(it.key)}
                  aria-pressed={on}>
                  <span className="pp-shop-box">{on && <Check size={13} strokeWidth={3} />}</span>
                  <span className="pp-shop-text">
                    <span className="pp-shop-name">{it.name}</span>
                    {it.amount && <span className="pp-shop-amt">{it.amount}</span>}
                  </span>
                  {it.mealCount > 1 && <span className="pp-shop-meals" title={`In ${it.mealCount} meals`}>×{it.mealCount}</span>}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

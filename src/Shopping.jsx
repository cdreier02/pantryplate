import React, { useMemo, useState } from "react";
import { Check, RotateCcw, CalendarDays, ShoppingBasket, ShoppingCart, ChevronDown } from "lucide-react";
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

  // still-needed items, by aisle (checked items leave their aisle)
  const activeSections = useMemo(
    () => sections
      .map((s) => ({ ...s, items: s.items.filter((it) => !checked[it.key]) }))
      .filter((s) => s.items.length),
    [sections, checked]
  );
  // checked items collected in one bucket, most-recently-checked first
  const cartItems = useMemo(() => {
    const out = [];
    for (const s of sections) {
      for (const it of s.items) {
        if (checked[it.key]) out.push({ ...it, ts: typeof checked[it.key] === "number" ? checked[it.key] : 0 });
      }
    }
    return out.sort((a, b) => b.ts - a.ts);
  }, [sections, checked]);

  const [cartOpen, setCartOpen] = useState(true);

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

  return (
    <div className="pp-shop">
      <div className="pp-shop-head">
        <div>
          <h2 className="pp-plan-title">Shopping list</h2>
          <p className="pp-fine">
            For {dishCount} {dishCount === 1 ? "dish" : "dishes"} ({batchCount} {batchCount === 1 ? "batch" : "batches"}) across your week. Check off what you have or grab.
          </p>
        </div>
        {cartItems.length > 0 && (
          <button className="pp-shop-clear" onClick={onClear}>
            <RotateCcw size={13} /> Uncheck all
          </button>
        )}
      </div>

      {activeSections.map((sec) => (
        <section className="pp-shop-section" key={sec.name}>
          <h3 className="pp-shop-secname">{sec.name} <span>{sec.items.length}</span></h3>
          <div className="pp-shop-items">
            {sec.items.map((it) => <ShopRow key={it.key} it={it} checked={false} onToggle={onToggle} />)}
          </div>
        </section>
      ))}

      {activeSections.length === 0 && cartItems.length > 0 && (
        <div className="pp-shop-alldone"><Check size={20} strokeWidth={2.4} /> Everything's in the cart.</div>
      )}

      {cartItems.length > 0 && (
        <section className="pp-cart">
          <button className="pp-cart-head" onClick={() => setCartOpen((v) => !v)} aria-expanded={cartOpen}>
            <span><ShoppingCart size={15} strokeWidth={2.2} /> In the cart <span className="pp-cart-count">{cartItems.length}</span></span>
            <ChevronDown size={16} className={cartOpen ? "rot" : ""} />
          </button>
          {cartOpen && (
            <div className="pp-shop-items pp-cart-items">
              {cartItems.map((it) => <ShopRow key={it.key} it={it} checked onToggle={onToggle} />)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function ShopRow({ it, checked, onToggle }) {
  return (
    <button className={"pp-shop-item" + (checked ? " checked" : "")} onClick={() => onToggle(it.key)} aria-pressed={checked}>
      <span className="pp-shop-box">{checked && <Check size={13} strokeWidth={3} />}</span>
      <span className="pp-shop-text">
        <span className="pp-shop-name">{it.name}</span>
        {it.amount && <span className="pp-shop-amt">{it.amount}</span>}
      </span>
      {it.mealCount > 1 && <span className="pp-shop-meals" title={`In ${it.mealCount} meals`}>×{it.mealCount}</span>}
    </button>
  );
}

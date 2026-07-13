import React, { useMemo, useState } from "react";
import { Check, RotateCcw, CalendarDays, ShoppingBasket, ShoppingCart, ChevronDown, Plus, X } from "lucide-react";
import { buildShoppingList, extraToItem, SECTION_ORDER } from "./shoppingList.js";
import { planBatches } from "./weekPlan.js";

export default function Shopping({ allMeals, plan, extras, checked, onToggle, onClear, onAddExtra, onRemoveExtra, onPlan }) {
  const byId = useMemo(() => {
    const m = new Map();
    for (const meal of allMeals) m.set(meal.id, meal);
    return m;
  }, [allMeals]);

  // distinct recipes × how many batches to cook (one batch covers `servings` days)
  const entries = useMemo(() => (plan ? planBatches(plan, byId) : []), [plan, byId]);
  const dishCount = entries.length;
  const batchCount = useMemo(() => entries.reduce((n, e) => n + e.batches, 0), [entries]);

  // plan-derived items plus the user's own additions, filed into the same aisles
  const sections = useMemo(() => {
    const base = buildShoppingList(entries);
    if (!extras.length) return base;
    const byName = new Map(base.map((s) => [s.name, { ...s, items: [...s.items] }]));
    for (const ex of extras) {
      const it = extraToItem(ex);
      if (!byName.has(it.category)) byName.set(it.category, { name: it.category, items: [] });
      byName.get(it.category).items.push(it);
    }
    return SECTION_ORDER
      .map((name) => byName.get(name))
      .filter((s) => s && s.items.length)
      .map((s) => ({ ...s, items: [...s.items].sort((a, b) => a.name.localeCompare(b.name)) }));
  }, [entries, extras]);
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
  const [draft, setDraft] = useState("");

  const submitExtra = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onAddExtra(text);
    setDraft("");
  };

  const subtitle = dishCount > 0
    ? `For ${dishCount} ${dishCount === 1 ? "dish" : "dishes"} (${batchCount} ${batchCount === 1 ? "batch" : "batches"}) across your week${extras.length ? `, plus ${extras.length} ${extras.length === 1 ? "item" : "items"} you added` : ""}. Check off what you have or grab.`
    : "Your own items. Check off what you have or grab.";

  return (
    <div className="pp-shop">
      <div className="pp-shop-head">
        <div>
          <h2 className="pp-plan-title">Shopping list</h2>
          <p className="pp-fine">{subtitle}</p>
        </div>
        {cartItems.length > 0 && (
          <button className="pp-shop-clear" onClick={onClear}>
            <RotateCcw size={13} /> Uncheck all
          </button>
        )}
      </div>

      <form className="pp-shop-add" onSubmit={submitExtra}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder='Add your own item — e.g. "2 lemons" or "paper towels"'
          aria-label="Add an item to the shopping list"
        />
        <button type="submit" disabled={!draft.trim()}>
          <Plus size={15} strokeWidth={2.4} /> Add
        </button>
      </form>

      {total === 0 && (
        <div className="pp-empty">
          <ShoppingBasket size={26} strokeWidth={1.6} />
          <p>Nothing on the list yet.</p>
          <p className="pp-fine">Plan a week and your shopping list builds itself — or add items above.</p>
          <button className="pp-shuffle" style={{ marginTop: 14 }} onClick={onPlan}>
            <CalendarDays size={15} strokeWidth={2.3} /> Plan my week
          </button>
        </div>
      )}

      {activeSections.map((sec) => (
        <section className="pp-shop-section" key={sec.name}>
          <h3 className="pp-shop-secname">{sec.name} <span>{sec.items.length}</span></h3>
          <div className="pp-shop-items">
            {sec.items.map((it) => <ShopRow key={it.key} it={it} checked={false} onToggle={onToggle} onRemove={onRemoveExtra} />)}
          </div>
        </section>
      ))}

      {total > 0 && activeSections.length === 0 && cartItems.length > 0 && (
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
              {cartItems.map((it) => <ShopRow key={it.key} it={it} checked onToggle={onToggle} onRemove={onRemoveExtra} />)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function ShopRow({ it, checked, onToggle, onRemove }) {
  return (
    <div className={"pp-shop-item" + (checked ? " checked" : "")}>
      <button className="pp-shop-hit" onClick={() => onToggle(it.key)} aria-pressed={checked}>
        <span className="pp-shop-box">{checked && <Check size={13} strokeWidth={3} />}</span>
        <span className="pp-shop-text">
          <span className="pp-shop-name">{it.name}</span>
          {it.amount && <span className="pp-shop-amt">{it.amount}</span>}
        </span>
      </button>
      {it.mealCount > 1 && <span className="pp-shop-meals" title={`In ${it.mealCount} meals`}>×{it.mealCount}</span>}
      {it.extra && onRemove && (
        <button className="pp-shop-x" title="Remove from list" aria-label={`Remove ${it.name}`} onClick={() => onRemove(it.extraId)}>
          <X size={13} strokeWidth={2.4} />
        </button>
      )}
    </div>
  );
}

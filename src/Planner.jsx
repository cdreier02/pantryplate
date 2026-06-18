import React, { useMemo, useState, useCallback } from "react";
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors, useDraggable, useDroppable,
} from "@dnd-kit/core";
import {
  Shuffle, Clock, Search, X, GripVertical, Minus, Plus, Soup, Replace, Trash2, Check,
} from "lucide-react";
import {
  poolForKind, cookingThisWeek, leftoverFlags, isBatchy, isKindFull,
  addRandomDish, removeTopDish, removeDishById, replaceDishById, swapGridSlots,
} from "./weekPlan.js";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SLOT_LABEL = { dinner: "Dinner", flex: "Anytime" };
const leftoverLabel = (meal) => (isBatchy(meal) ? "Leftovers" : "Again");

export default function Planner({ allMeals, plan, cooked = {}, onToggleCooked, prepDay = 6, onChangePrepDay, onShuffle, onChange, onViewRecipe }) {
  const byId = useMemo(() => {
    const m = new Map();
    for (const meal of allMeals) m.set(meal.id, meal);
    return m;
  }, [allMeals]);

  const [activeId, setActiveId] = useState(null);
  const [picker, setPicker] = useState(null); // { kind, oldId } | null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const parse = (id) => {
    const [d, kind] = String(id).split("-");
    return { dayIndex: Number(d), kind };
  };

  const onDragEnd = useCallback(({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const a = parse(active.id);
    const b = parse(over.id);
    if (a.kind !== b.kind) return; // only swap like-for-like slots
    onChange(swapGridSlots(plan, a.dayIndex, b.dayIndex, a.kind));
  }, [plan, onChange]);

  const cooking = useMemo(() => cookingThisWeek(plan, byId), [plan, byId]);
  const leftovers = useMemo(() => leftoverFlags(plan.grid), [plan.grid]);

  const activeMeal = activeId ? byId.get(plan.grid[parse(activeId).dayIndex]?.[parse(activeId).kind]) : null;

  return (
    <div className="pp-plan">
      <div className="pp-plan-head">
        <div>
          <h2 className="pp-plan-title">Your week</h2>
          <p className="pp-fine">A few batch-cooked dishes spread across the week as leftovers. Edit the dishes below; drag cards in the grid to swap days.</p>
        </div>
        <div className="pp-plan-actions">
          <button className="pp-shuffle" onClick={onShuffle}>
            <Shuffle size={15} strokeWidth={2.3} /> Shuffle week
          </button>
          <label className="pp-prepday">
            <span>Prep day</span>
            <select value={prepDay} onChange={(e) => onChangePrepDay(Number(e.target.value))}>
              {DAY_NAMES.map((n, i) => <option key={i} value={i}>{n}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="pp-cook">
        <DishList title="Dinners" kind="dinner" items={cooking.dinners} plan={plan}
          cooked={cooked} onToggleCooked={onToggleCooked}
          onAdd={() => onChange(addRandomDish(plan, allMeals, "dinner"))}
          onRemoveTop={() => onChange(removeTopDish(plan, "dinner"))}
          onRemove={(id) => onChange(removeDishById(plan, id))}
          onReplace={(id) => setPicker({ kind: "dinner", oldId: id })} />
        <DishList title="Breakfasts & snacks" kind="flex" items={cooking.flex} plan={plan}
          cooked={cooked} onToggleCooked={onToggleCooked}
          onAdd={() => onChange(addRandomDish(plan, allMeals, "flex"))}
          onRemoveTop={() => onChange(removeTopDish(plan, "flex"))}
          onRemove={(id) => onChange(removeDishById(plan, id))}
          onReplace={(id) => setPicker({ kind: "flex", oldId: id })} />
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={({ active }) => setActiveId(active.id)}
        onDragCancel={() => setActiveId(null)}
        onDragEnd={onDragEnd}
      >
        <div className="pp-week">
          {plan.grid.map((day, i) => (
            <div className="pp-day" key={i}>
              <div className="pp-dayname">{DAY_NAMES[i]}</div>
              <SlotCard dayIndex={i} kind="dinner" meal={byId.get(day.dinner)}
                leftover={leftovers[i]?.dinner} onView={onViewRecipe} />
              <SlotCard dayIndex={i} kind="flex" meal={byId.get(day.flex)}
                leftover={leftovers[i]?.flex} onView={onViewRecipe} />
            </div>
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeMeal ? <CardFace meal={activeMeal} dragging /> : null}
        </DragOverlay>
      </DndContext>

      {picker && (
        <PickerModal
          meals={poolForKind(allMeals, picker.kind)}
          excludeIds={(picker.kind === "dinner" ? plan.dinners : plan.flex).filter((x) => x !== picker.oldId)}
          current={picker.oldId}
          kindLabel={picker.kind === "dinner" ? "dinner" : "breakfast, lunch or snack"}
          onClose={() => setPicker(null)}
          onPick={(id) => { onChange(replaceDishById(plan, picker.oldId, id)); setPicker(null); }}
        />
      )}
    </div>
  );
}

function DishList({ title, kind, items, plan, cooked = {}, onToggleCooked, onAdd, onRemoveTop, onRemove, onReplace }) {
  const count = (kind === "dinner" ? plan.dinners : plan.flex).length;
  const cookedCount = items.filter((it) => cooked[it.id]).length;
  return (
    <div className="pp-cook-col">
      <div className="pp-cook-head">
        <h4 className="pp-cook-title">
          <Soup size={13} strokeWidth={2.2} /> {title}
          {cookedCount > 0 && <span className="pp-cook-progress">{cookedCount}/{count} cooked</span>}
        </h4>
        <div className="pp-stepper-ctl">
          <button onClick={onRemoveTop} disabled={count <= 1} aria-label={`Remove a ${title} dish`}><Minus size={14} strokeWidth={2.6} /></button>
          <span className="pp-stepper-val">{count}</span>
          <button onClick={onAdd} disabled={isKindFull(plan, kind)} aria-label={`Add a random ${title} dish`}><Plus size={14} strokeWidth={2.6} /></button>
        </div>
      </div>
      <div className="pp-cook-list">
        {items.map((it) => {
          const isCooked = !!cooked[it.id];
          return (
            <div key={it.id} className={"pp-cook-item" + (isCooked ? " cooked" : "")} role="button" tabIndex={0}
              onClick={() => onReplace(it.id)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onReplace(it.id))}
              title="Tap to swap for a different meal">
              <button className="pp-cook-check" aria-pressed={isCooked}
                aria-label={isCooked ? `Mark ${it.meal.name} not cooked` : `Mark ${it.meal.name} cooked`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onToggleCooked && onToggleCooked(it.id); }}>
                {isCooked && <Check size={12} strokeWidth={3} />}
              </button>
              <span className="pp-cook-text">
                <span className="pp-cook-name">{it.meal.name}</span>
                <span className="pp-cook-meta">
                  covers {it.days} {it.days === 1 ? "day" : "days"}{it.batches > 1 ? ` · cook ×${it.batches}` : ""}
                </span>
              </span>
              <Replace className="pp-cook-swap" size={15} aria-hidden="true" />
              <button className="pp-cook-remove" aria-label={`Remove ${it.meal.name}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onRemove(it.id); }}>
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
        {!items.length && <p className="pp-fine" style={{ padding: "4px 2px" }}>None yet — add one with +.</p>}
      </div>
    </div>
  );
}

function SlotCard({ dayIndex, kind, meal, leftover, onView }) {
  const id = `${dayIndex}-${kind}`;
  const data = { dayIndex, kind };
  const drag = useDraggable({ id, data, disabled: !meal });
  const drop = useDroppable({ id, data });
  const setRef = (node) => { drag.setNodeRef(node); drop.setNodeRef(node); };

  if (!meal) {
    return (
      <div ref={drop.setNodeRef} className={"pp-slot empty" + (drop.isOver ? " over" : "")}>
        <span className="pp-slot-kind">{SLOT_LABEL[kind]}</span>
        <span className="pp-slot-empty">—</span>
      </div>
    );
  }

  const cls =
    "pp-slot" +
    (kind === "flex" ? " flex" : "") +
    (leftover ? " leftover" : "") +
    (drag.isDragging ? " dragging" : "") +
    (drop.isOver ? " over" : "");

  return (
    <div ref={setRef} {...drag.attributes} {...drag.listeners}
      className={cls} role="button" tabIndex={0}
      aria-label={`${SLOT_LABEL[kind]}: ${meal.name}${leftover ? " (leftovers)" : ""}. Tap for recipe, drag to swap days.`}
      onClick={() => onView(meal)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onView(meal))}>
      <CardFace meal={meal} leftover={leftover} />
    </div>
  );
}

function CardFace({ meal, leftover, dragging }) {
  return (
    <div className={"pp-slot-face" + (dragging ? " drag" : "")}>
      <div className="pp-slot-tags">
        <span className={"pp-type t-" + meal.type.toLowerCase()}>{meal.type}</span>
        {leftover && <span className="pp-leftover">{leftoverLabel(meal)}</span>}
      </div>
      <h4 className="pp-slot-name">{meal.name}</h4>
      <div className="pp-slot-stats">
        <span><b>{meal.cal}</b> kcal</span>
        <span><b>{meal.fiber}g</b> fiber</span>
        <span><Clock size={11} /> {meal.time}m</span>
      </div>
      {!dragging && <GripVertical className="pp-slot-grip" size={15} aria-hidden="true" />}
    </div>
  );
}

function PickerModal({ meals, excludeIds, current, kindLabel, onClose, onPick }) {
  const [q, setQ] = useState("");
  const exclude = new Set(excludeIds || []);
  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = meals.filter((m) => !exclude.has(m.id) && (
      !query || (m.name + " " + (m.tags || []).join(" ")).toLowerCase().includes(query)
    ));
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [meals, q]);

  return (
    <div className="pp-overlay" onClick={onClose}>
      <div className="pp-modal pp-picker" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="pp-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <h2 className="pp-detailname">Swap meal</h2>
        <p className="pp-fine">Choose a different {kindLabel} for this slot.</p>
        <div className="pp-searchwrap pp-picker-search">
          <Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search meals" aria-label="Search meals" autoFocus />
          {q && <button className="pp-clear" onClick={() => setQ("")} aria-label="Clear"><X size={14} /></button>}
        </div>
        <div className="pp-picker-list">
          {shown.map((m) => (
            <button key={m.id} className={"pp-picker-item" + (m.id === current ? " current" : "")} onClick={() => onPick(m.id)}>
              <span className={"pp-type t-" + m.type.toLowerCase()}>{m.type}</span>
              <span className="pp-picker-name">{m.name}</span>
              <span className="pp-picker-stats">{m.cal} kcal · {m.fiber}g fiber · {m.time}m</span>
              {m.id === current && <span className="pp-picker-cur">current</span>}
            </button>
          ))}
          {shown.length === 0 && <p className="pp-fine" style={{ padding: "12px 2px" }}>No meals match.</p>}
        </div>
      </div>
    </div>
  );
}

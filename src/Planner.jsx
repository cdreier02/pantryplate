import React, { useMemo, useState, useCallback } from "react";
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors, useDraggable, useDroppable,
} from "@dnd-kit/core";
import {
  Shuffle, Clock, Search, X, GripVertical, BookOpen, Minus, Plus, Soup,
} from "lucide-react";
import {
  poolForKind, cookingThisWeek, leftoverFlags, isBatchy,
} from "./weekPlan.js";

const SLOT_LABEL = { dinner: "Dinner", flex: "Anytime" };
const leftoverLabel = (meal) => (isBatchy(meal) ? "Leftovers" : "Again");

export default function Planner({ allMeals, plan, config, onChange, onShuffle, onCountChange, onViewRecipe }) {
  const byId = useMemo(() => {
    const m = new Map();
    for (const meal of allMeals) m.set(meal.id, meal);
    return m;
  }, [allMeals]);

  const [activeId, setActiveId] = useState(null);
  const [picker, setPicker] = useState(null); // { dayIndex, kind } | null

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
    const next = plan.map((d) => ({ ...d }));
    const tmp = next[a.dayIndex][a.kind];
    next[a.dayIndex][a.kind] = next[b.dayIndex][b.kind];
    next[b.dayIndex][b.kind] = tmp;
    onChange(next);
  }, [plan, onChange]);

  const openPicker = useCallback((dayIndex, kind) => setPicker({ dayIndex, kind }), []);

  const replaceSlot = (dayIndex, kind, mealId) => {
    const next = plan.map((d) => ({ ...d }));
    next[dayIndex][kind] = mealId;
    onChange(next);
    setPicker(null);
  };

  const cooking = useMemo(() => (plan ? cookingThisWeek(plan, byId) : { dinners: [], flex: [] }), [plan, byId]);
  const leftovers = useMemo(() => (plan ? leftoverFlags(plan) : []), [plan]);

  if (!plan) return null;

  const activeMealResolved = activeId
    ? byId.get(plan[parse(activeId).dayIndex]?.[parse(activeId).kind])
    : null;

  return (
    <div className="pp-plan">
      <div className="pp-plan-head">
        <div>
          <h2 className="pp-plan-title">Your week</h2>
          <p className="pp-fine">A few batch-cooked dishes spread across the week as leftovers. Drag a card onto another day to swap; tap to pick a different meal.</p>
        </div>
        <button className="pp-shuffle" onClick={onShuffle}>
          <Shuffle size={15} strokeWidth={2.3} /> Shuffle week
        </button>
      </div>

      <div className="pp-steppers">
        <Stepper label="Dinners" value={config.nDinners}
          onDec={() => onCountChange("dinner", -1)} onInc={() => onCountChange("dinner", 1)} />
        <Stepper label="Breakfasts & snacks" value={config.nFlex}
          onDec={() => onCountChange("flex", -1)} onInc={() => onCountChange("flex", 1)} />
      </div>

      <div className="pp-cook">
        <CookColumn title="Cooking — dinners" items={cooking.dinners} onView={onViewRecipe} />
        <CookColumn title="Cooking — breakfasts & snacks" items={cooking.flex} onView={onViewRecipe} />
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={({ active }) => setActiveId(active.id)}
        onDragCancel={() => setActiveId(null)}
        onDragEnd={onDragEnd}
      >
        <div className="pp-week">
          {plan.map((day, i) => (
            <div className="pp-day" key={i}>
              <div className="pp-dayname">{DAY_NAMES[i]}</div>
              <SlotCard dayIndex={i} kind="dinner" meal={byId.get(day.dinner)}
                leftover={leftovers[i]?.dinner} onPick={openPicker} onView={onViewRecipe} />
              <SlotCard dayIndex={i} kind="flex" meal={byId.get(day.flex)}
                leftover={leftovers[i]?.flex} onPick={openPicker} onView={onViewRecipe} />
            </div>
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeMealResolved ? <CardFace meal={activeMealResolved} dragging /> : null}
        </DragOverlay>
      </DndContext>

      {picker && (
        <PickerModal
          meals={poolForKind(allMeals, picker.kind)}
          current={plan[picker.dayIndex]?.[picker.kind]}
          kindLabel={picker.kind === "dinner" ? "dinner" : "breakfast, lunch or snack"}
          onClose={() => setPicker(null)}
          onPick={(id) => replaceSlot(picker.dayIndex, picker.kind, id)}
        />
      )}
    </div>
  );
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function Stepper({ label, value, onDec, onInc }) {
  return (
    <div className="pp-stepper">
      <span className="pp-stepper-label">{label}</span>
      <div className="pp-stepper-ctl">
        <button onClick={onDec} disabled={value <= 1} aria-label={`Fewer ${label}`}><Minus size={14} strokeWidth={2.6} /></button>
        <span className="pp-stepper-val">{value}</span>
        <button onClick={onInc} disabled={value >= 7} aria-label={`More ${label}`}><Plus size={14} strokeWidth={2.6} /></button>
      </div>
    </div>
  );
}

function CookColumn({ title, items, onView }) {
  if (!items.length) return null;
  return (
    <div className="pp-cook-col">
      <h4 className="pp-cook-title"><Soup size={13} strokeWidth={2.2} /> {title}</h4>
      <div className="pp-cook-list">
        {items.map((it) => (
          <button key={it.id} className="pp-cook-item" onClick={() => onView(it.meal)} title="View recipe">
            <span className="pp-cook-name">{it.meal.name}</span>
            <span className="pp-cook-meta">
              covers {it.days} {it.days === 1 ? "day" : "days"}
              {it.batches > 1 ? ` · cook ×${it.batches}` : ""}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SlotCard({ dayIndex, kind, meal, leftover, onPick, onView }) {
  const id = `${dayIndex}-${kind}`;
  const data = { dayIndex, kind };
  const drag = useDraggable({ id, data, disabled: !meal });
  const drop = useDroppable({ id, data });
  const setRef = (node) => { drag.setNodeRef(node); drop.setNodeRef(node); };

  const cls =
    "pp-slot" +
    (kind === "flex" ? " flex" : "") +
    (leftover ? " leftover" : "") +
    (drag.isDragging ? " dragging" : "") +
    (drop.isOver ? " over" : "");

  if (!meal) {
    return (
      <div ref={drop.setNodeRef}
        className={"pp-slot empty" + (drop.isOver ? " over" : "")}
        role="button" tabIndex={0}
        onClick={() => onPick(dayIndex, kind)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onPick(dayIndex, kind))}>
        <span className="pp-slot-kind">{SLOT_LABEL[kind]}</span>
        <span className="pp-slot-empty">+ Choose a meal</span>
      </div>
    );
  }

  return (
    <div ref={setRef} {...drag.attributes} {...drag.listeners}
      className={cls} role="button" tabIndex={0}
      aria-label={`${SLOT_LABEL[kind]}: ${meal.name}${leftover ? " (leftovers)" : ""}. Tap to change, drag to swap.`}
      onClick={() => onPick(dayIndex, kind)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onPick(dayIndex, kind))}>
      <button className="pp-slot-view" title="View recipe"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onView(meal); }}>
        <BookOpen size={14} />
      </button>
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

function PickerModal({ meals, current, kindLabel, onClose, onPick }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = query
      ? meals.filter((m) =>
          (m.name + " " + (m.tags || []).join(" ")).toLowerCase().includes(query))
      : meals;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [meals, q]);

  return (
    <div className="pp-overlay" onClick={onClose}>
      <div className="pp-modal pp-picker" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="pp-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <h2 className="pp-detailname">Pick a meal</h2>
        <p className="pp-fine">Choose a {kindLabel} for this slot.</p>
        <div className="pp-searchwrap pp-picker-search">
          <Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search meals" aria-label="Search meals" autoFocus />
          {q && <button className="pp-clear" onClick={() => setQ("")} aria-label="Clear"><X size={14} /></button>}
        </div>
        <div className="pp-picker-list">
          {shown.map((m) => (
            <button key={m.id}
              className={"pp-picker-item" + (m.id === current ? " current" : "")}
              onClick={() => onPick(m.id)}>
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

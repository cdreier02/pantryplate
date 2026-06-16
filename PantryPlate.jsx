import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, Star, Plus, X, Clock, Heart, Trash2, ChevronDown,
  Leaf, Sprout, RotateCcw, Check,
} from "lucide-react";

/* ----------------------------------------------------------------------------
   PantryPlate — a growable database of simple, LDL-friendly vegetarian meals.
   Nutrition values are rough per-serving estimates, shown to compare meals at a
   glance — not precise figures. The heart logic: lots of soluble fiber (oats,
   beans, lentils) + unsaturated fats (olive oil, nuts, tofu), little saturated
   fat (so cheese/butter/coconut stay scarce; egg whites are essentially free).
---------------------------------------------------------------------------- */

const SEED_MEALS = [
  {
    id: "pb-banana-oats",
    name: "Peanut Butter Banana Overnight Oats",
    type: "Breakfast", time: 5, fiber: 8, protein: 12, sat: "very low", cal: 380,
    why: "Oats carry beta-glucan, a soluble fiber shown to lower LDL; peanut butter swaps in unsaturated fat.",
    tags: ["high-fiber", "make-ahead", "no-cook", "soy-protein"],
    ingredients: ["½ cup rolled oats", "½ cup soy or low-fat milk", "1 tbsp natural peanut butter", "½ banana, sliced", "1 tsp chia seeds (optional)", "Pinch of cinnamon"],
    steps: ["Stir oats, milk, peanut butter and chia together in a jar.", "Top with banana and cinnamon.", "Refrigerate overnight. Eat cold, or warm 60 seconds."],
  },
  {
    id: "berry-walnut-oatmeal",
    name: "Berry Walnut Oatmeal",
    type: "Breakfast", time: 10, fiber: 9, protein: 10, sat: "very low", cal: 360,
    why: "Soluble fiber from oats plus walnuts (omega-3 ALA) — both gently push LDL down.",
    tags: ["high-fiber", "quick", "omega-3"],
    ingredients: ["½ cup rolled oats", "1 cup soy or low-fat milk (or water)", "½ cup frozen mixed berries", "2 tbsp chopped walnuts", "Cinnamon to taste"],
    steps: ["Simmer oats with milk 4–5 min, stirring.", "Stir in berries for the last minute.", "Top with walnuts and cinnamon."],
  },
  {
    id: "tofu-scramble",
    name: "Turmeric Tofu Scramble",
    type: "Breakfast", time: 15, fiber: 4, protein: 18, sat: "very low", cal: 340,
    why: "Tofu is soy protein with zero cholesterol — a heart-smart stand-in for scrambled eggs.",
    tags: ["high-protein", "cholesterol-free", "savory"],
    ingredients: ["½ block firm tofu, crumbled", "1 tsp olive oil", "¼ onion, diced", "½ bell pepper, diced", "1 handful spinach", "¼ tsp turmeric", "¼ tsp cumin", "Salt & black pepper", "Whole-grain toast to serve"],
    steps: ["Sauté onion and pepper in olive oil until soft.", "Add crumbled tofu, turmeric, cumin, salt and pepper; cook 5 min.", "Fold in spinach until wilted. Serve on toast."],
  },
  {
    id: "red-lentil-dal",
    name: "Red Lentil Dal with Rice",
    type: "Dinner", time: 30, fiber: 11, protein: 16, sat: "very low", cal: 360,
    why: "Lentils are packed with soluble fiber and plant protein, with essentially no saturated fat.",
    tags: ["high-fiber", "high-protein", "freezer-friendly", "one-pot"],
    ingredients: ["1 cup red lentils, rinsed", "1 tbsp olive oil", "1 onion, diced", "3 cloves garlic, minced", "1 tsp ground ginger (or fresh)", "1 can diced tomatoes", "1 tbsp curry powder", "1 tsp cumin", "2 cups water", "Cooked brown rice to serve", "Spinach (optional)"],
    steps: ["Sauté onion, garlic and ginger in olive oil.", "Add curry powder and cumin; stir 30 sec.", "Add lentils, tomatoes and water; simmer 20 min until soft.", "Stir in spinach if using. Serve over rice."],
  },
  {
    id: "black-bean-tacos",
    name: "Black Bean Tacos",
    type: "Dinner", time: 20, fiber: 12, protein: 13, sat: "low", cal: 400,
    why: "Beans plus avocado deliver soluble fiber and unsaturated fat; corn tortillas keep it light.",
    tags: ["high-fiber", "quick", "weeknight"],
    ingredients: ["1 can black beans, drained", "6 corn tortillas", "½ onion, diced", "1 bell pepper, diced", "1 tsp cumin", "1 tsp chili powder", "Salsa", "½ avocado, sliced", "Lime wedges"],
    steps: ["Sauté onion and pepper until soft.", "Add beans, cumin and chili powder; mash slightly and warm through.", "Warm tortillas. Fill with beans, salsa, avocado and a squeeze of lime."],
  },
  {
    id: "chickpea-spinach-curry",
    name: "Chickpea & Spinach Curry",
    type: "Dinner", time: 30, fiber: 11, protein: 14, sat: "low", cal: 380,
    why: "Tomato-based instead of coconut keeps saturated fat low while chickpeas pile on fiber.",
    tags: ["high-fiber", "high-protein", "one-pot"],
    ingredients: ["2 cans chickpeas, drained", "1 tbsp olive oil", "1 onion, diced", "3 cloves garlic, minced", "1 can diced tomatoes", "1 tbsp curry powder", "1 tsp cumin", "2 handfuls spinach", "Cooked rice to serve"],
    steps: ["Sauté onion and garlic in olive oil.", "Add spices, then tomatoes and chickpeas; simmer 15 min.", "Stir in spinach until wilted. Serve over rice."],
  },
  {
    id: "lentil-veg-soup",
    name: "Hearty Lentil & Vegetable Soup",
    type: "Dinner", time: 40, fiber: 13, protein: 15, sat: "very low", cal: 260,
    why: "A soluble-fiber powerhouse that makes a big batch and freezes beautifully.",
    tags: ["low-cal", "high-fiber", "freezer-friendly", "one-pot", "batch"],
    ingredients: ["1 cup brown or green lentils", "1 tbsp olive oil", "1 onion, diced", "2 carrots, diced", "2 celery stalks, diced", "3 cloves garlic, minced", "1 can diced tomatoes", "6 cups low-sodium veg broth", "1 tsp cumin", "1 tsp oregano", "1 bay leaf"],
    steps: ["Sauté onion, carrot and celery in olive oil 5 min.", "Add garlic and spices, then lentils, tomatoes and broth.", "Simmer 30 min until lentils are tender. Remove bay leaf."],
  },
  {
    id: "minestrone",
    name: "Minestrone",
    type: "Dinner", time: 35, fiber: 12, protein: 13, sat: "low", cal: 300,
    why: "Beans, vegetables and whole-grain pasta; going light on cheese keeps saturated fat down.",
    tags: ["low-cal", "high-fiber", "batch", "one-pot"],
    ingredients: ["1 can cannellini beans, drained", "¾ cup whole wheat pasta", "1 can diced tomatoes", "1 carrot, diced", "1 celery stalk, diced", "1 onion, diced", "3 cloves garlic", "2 handfuls spinach or kale", "5 cups veg broth", "1 tsp oregano", "1 tbsp olive oil"],
    steps: ["Sauté onion, carrot, celery and garlic in olive oil.", "Add tomatoes, broth, beans and oregano; simmer 15 min.", "Add pasta; cook until al dente.", "Stir in greens until wilted."],
  },
  {
    id: "three-bean-chili",
    name: "Three-Bean Veggie Chili",
    type: "Dinner", time: 40, fiber: 15, protein: 18, sat: "low", cal: 330,
    why: "Three kinds of beans stack soluble fiber; no meat means no saturated fat.",
    tags: ["high-fiber", "high-protein", "freezer-friendly", "batch"],
    ingredients: ["1 can kidney beans", "1 can black beans", "1 can pinto beans", "1 can diced tomatoes", "2 tbsp tomato paste", "1 onion, diced", "1 bell pepper, diced", "3 cloves garlic", "1 tbsp chili powder", "1 tsp cumin", "1 tsp smoked paprika", "1 tbsp olive oil"],
    steps: ["Sauté onion, pepper and garlic in olive oil.", "Stir in spices and tomato paste for 1 min.", "Add tomatoes and all beans; simmer 25 min, stirring now and then."],
  },
  {
    id: "tofu-broccoli-stirfry",
    name: "Tofu & Broccoli Stir-Fry",
    type: "Dinner", time: 25, fiber: 7, protein: 20, sat: "low", cal: 390,
    why: "Soy protein plus a pile of vegetables, with just a touch of oil.",
    tags: ["high-protein", "quick", "cholesterol-free"],
    ingredients: ["1 block firm tofu, cubed", "1 head broccoli, florets", "1 bell pepper, sliced", "1 carrot, sliced", "3 cloves garlic", "1 tsp ground ginger (or fresh)", "2 tbsp low-sodium soy sauce", "1 tbsp olive oil", "Cooked brown rice to serve"],
    steps: ["Brown tofu cubes in oil; set aside.", "Stir-fry broccoli, pepper and carrot 4–5 min.", "Add garlic, ginger, soy sauce and tofu; toss 2 min. Serve over rice."],
  },
  {
    id: "white-beans-greens-pasta",
    name: "White Beans & Greens Pasta",
    type: "Dinner", time: 20, fiber: 10, protein: 16, sat: "low", cal: 450,
    why: "Olive oil and beans stand in for cream and cheese — fiber up, saturated fat down.",
    tags: ["high-fiber", "quick", "weeknight"],
    ingredients: ["3 cups whole wheat pasta", "1 can cannellini beans, drained", "3 handfuls spinach or kale", "4 cloves garlic, sliced", "2 tbsp olive oil", "½ lemon, juiced", "Pinch red pepper flakes", "Black pepper"],
    steps: ["Boil pasta; reserve ½ cup water before draining.", "Gently sizzle garlic and red pepper in olive oil.", "Add beans and greens until wilted, splash in pasta water.", "Toss with pasta and lemon; finish with black pepper."],
  },
  {
    id: "stuffed-sweet-potato",
    name: "Stuffed Sweet Potato with Black Beans",
    type: "Dinner", time: 45, fiber: 12, protein: 11, sat: "very low", cal: 310,
    why: "Sweet potato and beans bring fiber and potassium — skip the sour cream and cheese.",
    tags: ["low-cal", "high-fiber", "hands-off", "gluten-free"],
    ingredients: ["2 sweet potatoes", "1 can black beans, drained", "½ cup corn", "Salsa", "½ tsp cumin", "Lime", "2 scallions, sliced", "Low-fat plain yogurt (optional dollop)"],
    steps: ["Bake sweet potatoes at 400°F / 200°C for 40 min until soft.", "Warm beans and corn with cumin.", "Split potatoes; pile on beans, corn, salsa, scallions and lime."],
  },
  {
    id: "tahini-chickpea-bowl",
    name: "Lemon-Tahini Chickpea Quinoa Bowl",
    type: "Lunch", time: 25, fiber: 10, protein: 15, sat: "low", cal: 440,
    why: "Quinoa and chickpeas for protein; tahini and olive oil are unsaturated fats.",
    tags: ["high-protein", "high-fiber", "make-ahead"],
    ingredients: ["1 cup quinoa, cooked", "1 can chickpeas, drained", "1 cucumber, diced", "1 cup cherry tomatoes, halved", "¼ red onion, sliced", "2 tbsp tahini", "1 lemon, juiced", "1 clove garlic, grated", "1 tbsp olive oil", "Water to thin"],
    steps: ["Whisk tahini, lemon, garlic, olive oil and a little water into a dressing.", "Combine quinoa, chickpeas, cucumber, tomato and onion.", "Toss with dressing."],
  },
  {
    id: "med-chickpea-salad",
    name: "Big Mediterranean Chickpea Salad",
    type: "Lunch", time: 15, fiber: 9, protein: 12, sat: "low", cal: 290,
    why: "Olive oil and chickpeas make a fast, no-cook, heart-healthy lunch.",
    tags: ["low-cal", "quick", "no-cook", "high-fiber"],
    ingredients: ["1 can chickpeas, drained", "4 cups mixed greens", "1 cucumber, diced", "2 tomatoes, chopped", "¼ red onion, sliced", "2 tbsp olive oil", "1 tbsp red wine vinegar", "1 tsp oregano", "A few olives (optional)"],
    steps: ["Whisk olive oil, vinegar and oregano.", "Toss everything together.", "Season and serve."],
  },
  {
    id: "veg-fried-rice",
    name: "Veggie Fried Brown Rice with Edamame",
    type: "Dinner", time: 20, fiber: 8, protein: 16, sat: "low", cal: 410,
    why: "Edamame adds soy protein and fiber; one egg white keeps cholesterol negligible.",
    tags: ["quick", "uses-leftovers", "high-protein"],
    ingredients: ["3 cups cooked brown rice (cold)", "1 cup frozen edamame or peas", "1 carrot, diced", "1 bell pepper, diced", "3 cloves garlic", "2 scallions", "2 tbsp low-sodium soy sauce", "1 tbsp olive oil", "1 egg white (optional)"],
    steps: ["Stir-fry carrot and pepper in oil 3 min.", "Add garlic, edamame and rice; toss until hot.", "Push aside; scramble egg white if using, then mix in.", "Finish with soy sauce and scallions."],
  },
  {
    id: "hummus-veg-plate",
    name: "Hummus & Veg Plate or Wrap",
    type: "Snack", time: 10, fiber: 8, protein: 9, sat: "very low", cal: 390,
    why: "A chickpea-and-tahini base with soluble fiber and unsaturated fat — snack or light lunch.",
    tags: ["no-cook", "snack", "high-fiber"],
    ingredients: ["1 can chickpeas (or store hummus)", "2 tbsp tahini", "1 lemon, juiced", "1 clove garlic", "1 tbsp olive oil", "Carrots, cucumber, bell pepper, sliced", "Whole wheat pita"],
    steps: ["Blend chickpeas, tahini, lemon, garlic, olive oil and a splash of water.", "Serve with raw veg and pita — or roll into a wrap."],
  },
  {
    id: "light-lemon-chickpea-salad",
    name: "Light Lemon & Herb Chickpea Salad",
    type: "Lunch", time: 10, fiber: 9, protein: 11, sat: "very low", cal: 220,
    why: "Almost all fiber and protein with barely any fat \u2014 chickpeas and crisp veg make it filling for very few calories.",
    tags: ["low-cal", "high-fiber", "no-cook", "quick"],
    ingredients: ["1 can chickpeas, drained", "1 cucumber, diced", "1 cup cherry tomatoes, halved", "\u00bc red onion, finely diced", "Small handful parsley, chopped", "1 lemon, juiced", "1 tsp olive oil", "Salt & black pepper"],
    steps: ["Toss chickpeas, cucumber, tomato, onion and parsley together.", "Dress with lemon, the teaspoon of olive oil, salt and pepper.", "Chill 10 minutes if you have time \u2014 it's even better cold."],
  },
];

const CORE_PANTRY = [
  { group: "Legumes", items: ["Black beans", "Kidney beans", "Pinto beans", "Cannellini beans", "Chickpeas", "Red lentils", "Brown/green lentils"] },
  { group: "Grains", items: ["Rolled oats", "Brown rice", "Quinoa", "Whole wheat pasta", "Whole-grain bread", "Corn tortillas"] },
  { group: "Produce", items: ["Onion", "Garlic", "Carrot", "Celery", "Bell pepper", "Spinach / kale", "Tomatoes", "Sweet potato", "Banana", "Lemon / lime", "Frozen peas / edamame / berries"] },
  { group: "Protein & fats", items: ["Firm tofu", "Peanut butter", "Walnuts", "Tahini", "Olive oil", "Avocado"] },
  { group: "Flavor", items: ["Cumin", "Chili powder", "Smoked paprika", "Curry powder", "Turmeric", "Oregano", "Cinnamon", "Low-sodium soy sauce", "Canned diced tomatoes"] },
];

const TYPES = ["All", "Breakfast", "Lunch", "Dinner", "Snack"];
const SORTS = [
  { key: "name", label: "A–Z" },
  { key: "time", label: "Fastest" },
  { key: "fiber", label: "Most fiber" },
  { key: "cal", label: "Lightest" },
];

const hasStorage = typeof window !== "undefined" && window.storage;

async function loadKey(key, fallback) {
  if (!hasStorage) return fallback;
  try {
    const r = await window.storage.get(key);
    return r ? JSON.parse(r.value) : fallback;
  } catch {
    return fallback;
  }
}
async function saveKey(key, value) {
  if (!hasStorage) return;
  try {
    await window.storage.set(key, JSON.stringify(value));
  } catch (e) {
    console.error("Could not save", key, e);
  }
}

const SAT_DOTS = { "very low": 1, low: 2, moderate: 3 };

export default function PantryPlate() {
  const [custom, setCustom] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const [query, setQuery] = useState("");
  const [type, setType] = useState("All");
  const [activeTags, setActiveTags] = useState([]);
  const [sort, setSort] = useState("name");
  const [favOnly, setFavOnly] = useState(false);

  const [open, setOpen] = useState(null);     // meal being viewed
  const [adding, setAdding] = useState(false);
  const [pantryOpen, setPantryOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setCustom(await loadKey("meals:custom", []));
      setFavorites(await loadKey("meals:favorites", []));
      setLoaded(true);
    })();
  }, []);

  const allMeals = useMemo(() => [...SEED_MEALS, ...custom], [custom]);

  const allTags = useMemo(() => {
    const s = new Set();
    allMeals.forEach((m) => m.tags?.forEach((t) => s.add(t)));
    return [...s].sort();
  }, [allMeals]);

  const toggleFav = useCallback((id) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      saveKey("meals:favorites", next);
      return next;
    });
  }, []);

  const addMeal = useCallback((meal) => {
    setCustom((prev) => {
      const next = [...prev, meal];
      saveKey("meals:custom", next);
      return next;
    });
  }, []);

  const deleteMeal = useCallback((id) => {
    setCustom((prev) => {
      const next = prev.filter((m) => m.id !== id);
      saveKey("meals:custom", next);
      return next;
    });
    setFavorites((prev) => {
      const next = prev.filter((x) => x !== id);
      saveKey("meals:favorites", next);
      return next;
    });
  }, []);

  const toggleTag = (t) =>
    setActiveTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const shown = useMemo(() => {
    let list = allMeals.filter((m) => {
      if (type !== "All" && m.type !== type) return false;
      if (favOnly && !favorites.includes(m.id)) return false;
      if (activeTags.length && !activeTags.every((t) => m.tags?.includes(t))) return false;
      if (query) {
        const q = query.toLowerCase();
        const hay = (m.name + " " + (m.ingredients || []).join(" ") + " " + (m.tags || []).join(" ")).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "time") return a.time - b.time;
      if (sort === "fiber") return b.fiber - a.fiber;
      if (sort === "cal") return a.cal - b.cal;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [allMeals, type, favOnly, favorites, activeTags, query, sort]);

  return (
    <div className="pp-root">
      <style>{CSS}</style>

      <header className="pp-header">
        <div className="pp-mark"><Sprout size={20} strokeWidth={2.2} /></div>
        <div className="pp-headtext">
          <h1>Pantry&thinsp;Plate</h1>
          <p>Simple vegetarian meals, built to keep cholesterol and calories low — all from one shared core pantry.</p>
        </div>
        <button className="pp-add" onClick={() => setAdding(true)}>
          <Plus size={16} strokeWidth={2.4} /> Add meal
        </button>
      </header>

      <button className="pp-why" onClick={() => setWhyOpen((v) => !v)} aria-expanded={whyOpen}>
        <Heart size={14} strokeWidth={2.2} />
        How these meals keep cholesterol low
        <ChevronDown size={15} className={whyOpen ? "rot" : ""} />
      </button>
      {whyOpen && (
        <div className="pp-whybody">
          <p>
            The biggest dietary lever on LDL ("bad") cholesterol is <strong>saturated fat</strong>, more than
            dietary cholesterol itself. So these recipes lean on two things:
          </p>
          <div className="pp-whygrid">
            <div><span className="pp-pill green">More</span> soluble fiber — oats, beans, lentils — and unsaturated fats from olive oil, nuts and tofu.</div>
            <div><span className="pp-pill green">Light</span> high-fiber, veg-forward meals are filling for few calories — sort by <strong>Lightest</strong> to surface the leanest first.</div>
            <div><span className="pp-pill amber">Less</span> saturated fat — cheese, butter, full-fat dairy and coconut milk stay scarce. Egg whites are essentially free; whole eggs are occasional.</div>
          </div>
          <p className="pp-fine">Stats below are rough per-serving estimates for comparing meals, not exact figures. General cooking guidance, not medical advice.</p>
        </div>
      )}

      <div className="pp-controls">
        <div className="pp-searchwrap">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search meals or ingredients"
            aria-label="Search meals"
          />
          {query && <button className="pp-clear" onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}
        </div>

        <div className="pp-typerow" role="tablist" aria-label="Meal type">
          {TYPES.map((t) => (
            <button key={t} role="tab" aria-selected={type === t}
              className={"pp-chip" + (type === t ? " on" : "")} onClick={() => setType(t)}>
              {t}
            </button>
          ))}
          <button className={"pp-chip fav" + (favOnly ? " on" : "")} onClick={() => setFavOnly((v) => !v)}>
            <Star size={13} fill={favOnly ? "currentColor" : "none"} strokeWidth={2} /> Favorites
          </button>
        </div>

        <div className="pp-sortrow">
          <span className="pp-sortlabel">Sort</span>
          {SORTS.map((s) => (
            <button key={s.key} className={"pp-sort" + (sort === s.key ? " on" : "")} onClick={() => setSort(s.key)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pp-tagrow">
        {allTags.map((t) => (
          <button key={t} className={"pp-tag" + (activeTags.includes(t) ? " on" : "")} onClick={() => toggleTag(t)}>
            {activeTags.includes(t) && <Check size={11} strokeWidth={3} />} {t}
          </button>
        ))}
        {activeTags.length > 0 && (
          <button className="pp-tag clear" onClick={() => setActiveTags([])}>clear tags</button>
        )}
      </div>

      <p className="pp-count">{shown.length} {shown.length === 1 ? "meal" : "meals"}</p>

      {shown.length === 0 ? (
        <div className="pp-empty">
          <Leaf size={26} strokeWidth={1.6} />
          <p>No meals match those filters yet.</p>
          <p className="pp-fine">Loosen a filter, or add a meal of your own.</p>
        </div>
      ) : (
        <div className="pp-grid">
          {shown.map((m) => (
            <article key={m.id} className="pp-card" onClick={() => setOpen(m)} tabIndex={0}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(m))}>
              <div className="pp-cardtop">
                <span className={"pp-type t-" + m.type.toLowerCase()}>{m.type}</span>
                <button className={"pp-star" + (favorites.includes(m.id) ? " on" : "")}
                  onClick={(e) => { e.stopPropagation(); toggleFav(m.id); }}
                  aria-label={favorites.includes(m.id) ? "Remove favorite" : "Add favorite"}>
                  <Star size={16} fill={favorites.includes(m.id) ? "currentColor" : "none"} strokeWidth={2} />
                </button>
              </div>
              <h3 className="pp-name">{m.name}</h3>
              <div className="pp-spec">
                <span><b>{m.fiber}g</b> fiber</span>
                <span><b>{m.protein}g</b> protein</span>
                <span><b>{m.cal}</b> kcal</span>
                <span className="pp-sat"><Dots n={SAT_DOTS[m.sat] || 2} /> sat fat</span>
                <span><Clock size={11} /> {m.time}m</span>
              </div>
              <div className="pp-cardtags">
                {m.tags?.slice(0, 3).map((t) => <span key={t}>{t}</span>)}
                {m.custom && <span className="mine">yours</span>}
              </div>
            </article>
          ))}
        </div>
      )}

      <CollapsiblePantry open={pantryOpen} setOpen={setPantryOpen} />

      {open && (
        <Modal onClose={() => setOpen(null)}>
          <div className="pp-detailtop">
            <span className={"pp-type t-" + open.type.toLowerCase()}>{open.type}</span>
            <div className="pp-detailbtns">
              <button className={"pp-star big" + (favorites.includes(open.id) ? " on" : "")}
                onClick={() => toggleFav(open.id)} aria-label="Toggle favorite">
                <Star size={18} fill={favorites.includes(open.id) ? "currentColor" : "none"} strokeWidth={2} />
              </button>
              {open.custom && (
                <button className="pp-del" onClick={() => { deleteMeal(open.id); setOpen(null); }} aria-label="Delete meal">
                  <Trash2 size={17} />
                </button>
              )}
            </div>
          </div>
          <h2 className="pp-detailname">{open.name}</h2>
          <div className="pp-spec detail">
            <span><b>{open.fiber}g</b> fiber</span>
            <span><b>{open.protein}g</b> protein</span>
            <span><b>{open.cal}</b> kcal</span>
            <span className="pp-sat"><Dots n={SAT_DOTS[open.sat] || 2} /> {open.sat} sat fat</span>
            <span><Clock size={12} /> {open.time} min</span>
          </div>
          <p className="pp-whyline"><Heart size={13} strokeWidth={2.2} /> {open.why}</p>
          <div className="pp-cols">
            <div>
              <h4>Ingredients</h4>
              <ul className="pp-ing">{open.ingredients?.map((i, k) => <li key={k}>{i}</li>)}</ul>
            </div>
            <div>
              <h4>Method</h4>
              <ol className="pp-steps">{open.steps?.map((s, k) => <li key={k}>{s}</li>)}</ol>
            </div>
          </div>
        </Modal>
      )}

      {adding && <AddMeal onClose={() => setAdding(false)} onSave={(m) => { addMeal(m); setAdding(false); }} />}

      {loaded && hasStorage && (custom.length > 0) && (
        <button className="pp-reset" onClick={() => {
          if (window.confirm("Remove all the meals you've added? This can't be undone.")) {
            setCustom([]); saveKey("meals:custom", []);
          }
        }}>
          <RotateCcw size={12} /> Clear my added meals
        </button>
      )}
      {!hasStorage && (
        <p className="pp-fine center">Saving is unavailable here, so meals you add won't persist between sessions.</p>
      )}
    </div>
  );
}

function Dots({ n }) {
  return (
    <span className="pp-dots" aria-hidden="true">
      {[0, 1, 2].map((i) => <i key={i} className={i < n ? "f" : ""} />)}
    </span>
  );
}

function CollapsiblePantry({ open, setOpen }) {
  return (
    <section className="pp-pantry">
      <button className="pp-pantrytoggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span><Leaf size={15} strokeWidth={2.2} /> The shared core pantry</span>
        <ChevronDown size={16} className={open ? "rot" : ""} />
      </button>
      {open && (
        <div className="pp-pantrybody">
          <p className="pp-fine">Every meal above is built from this list — so nothing gets bought once and left to spoil.</p>
          <div className="pp-pantrygrid">
            {CORE_PANTRY.map((g) => (
              <div key={g.group}>
                <h5>{g.group}</h5>
                <ul>{g.items.map((i) => <li key={i}>{i}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Modal({ children, onClose }) {
  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);
  return (
    <div className="pp-overlay" onClick={onClose}>
      <div className="pp-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="pp-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        {children}
      </div>
    </div>
  );
}

function AddMeal({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("Dinner");
  const [time, setTime] = useState("");
  const [fiber, setFiber] = useState("");
  const [protein, setProtein] = useState("");
  const [cal, setCal] = useState("");
  const [sat, setSat] = useState("low");
  const [tags, setTags] = useState("");
  const [why, setWhy] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");

  const valid = name.trim() && ingredients.trim();

  const save = () => {
    if (!valid) return;
    onSave({
      id: "custom-" + Date.now(),
      custom: true,
      name: name.trim(),
      type,
      time: Number(time) || 0,
      fiber: Number(fiber) || 0,
      protein: Number(protein) || 0,
      cal: Number(cal) || 0,
      sat,
      why: why.trim() || "Your recipe.",
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      ingredients: ingredients.split("\n").map((s) => s.trim()).filter(Boolean),
      steps: steps.split("\n").map((s) => s.trim()).filter(Boolean),
    });
  };

  return (
    <Modal onClose={onClose}>
      <h2 className="pp-detailname">Add a meal</h2>
      <p className="pp-fine">One ingredient or step per line. Only a name and ingredients are required.</p>
      <div className="pp-form">
        <label className="full">Name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Smoky White Bean Stew" /></label>
        <label>Type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.filter((t) => t !== "All").map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label>Time (min)<input type="number" value={time} onChange={(e) => setTime(e.target.value)} placeholder="30" /></label>
        <label>Fiber (g)<input type="number" value={fiber} onChange={(e) => setFiber(e.target.value)} placeholder="10" /></label>
        <label>Protein (g)<input type="number" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="14" /></label>
        <label>Calories<input type="number" value={cal} onChange={(e) => setCal(e.target.value)} placeholder="350" /></label>
        <label>Saturated fat
          <select value={sat} onChange={(e) => setSat(e.target.value)}>
            <option value="very low">very low</option>
            <option value="low">low</option>
            <option value="moderate">moderate</option>
          </select>
        </label>
        <label className="full">Tags (comma-separated)<input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="high-fiber, quick, one-pot" /></label>
        <label className="full">Why it's heart-smart (optional)<input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Beans bring soluble fiber; olive oil for unsaturated fat." /></label>
        <label className="full">Ingredients<textarea rows={5} value={ingredients} onChange={(e) => setIngredients(e.target.value)} placeholder={"1 can white beans\n2 cloves garlic\n1 tbsp olive oil"} /></label>
        <label className="full">Method<textarea rows={5} value={steps} onChange={(e) => setSteps(e.target.value)} placeholder={"Sauté the garlic.\nAdd beans and simmer."} /></label>
      </div>
      <div className="pp-formbtns">
        <button className="pp-ghost" onClick={onClose}>Cancel</button>
        <button className="pp-save" onClick={save} disabled={!valid}>Save meal</button>
      </div>
    </Modal>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');

.pp-root{
  --bg:#F1F5EC; --surface:#FFFFFF; --ink:#16241B; --soft:#5A6B5E;
  --green:#1F4D32; --green-mid:#3F7A50; --sprout:#84B26A;
  --amber:#C9871F; --amber-soft:#F6EAD0; --line:#E0E7D9; --danger:#B0492F;
  --fd:'Bricolage Grotesque',system-ui,sans-serif;
  --fb:'Inter',system-ui,sans-serif;
  --fm:'IBM Plex Mono',ui-monospace,monospace;
  font-family:var(--fb); color:var(--ink); background:var(--bg);
  max-width:1040px; margin:0 auto; padding:26px 20px 60px; line-height:1.5;
  -webkit-font-smoothing:antialiased;
}
.pp-root *{box-sizing:border-box}
.pp-root h1,.pp-root h2,.pp-root h3,.pp-root h4,.pp-root h5{font-family:var(--fd); margin:0; letter-spacing:-.02em}
.pp-root button{font-family:var(--fb); cursor:pointer}
.pp-root button:focus-visible,.pp-root input:focus-visible,.pp-root select:focus-visible,.pp-root textarea:focus-visible,.pp-card:focus-visible{
  outline:2.5px solid var(--amber); outline-offset:2px;
}

.pp-header{display:flex; align-items:center; gap:14px; margin-bottom:14px}
.pp-mark{width:42px; height:42px; flex:0 0 42px; border-radius:12px; background:var(--green); color:#EAF3E2; display:grid; place-items:center}
.pp-headtext{flex:1; min-width:0}
.pp-header h1{font-size:30px; font-weight:800; color:var(--green); line-height:1}
.pp-header p{margin:4px 0 0; font-size:14px; color:var(--soft)}
.pp-add{display:inline-flex; align-items:center; gap:6px; background:var(--green); color:#fff; border:none; border-radius:10px; padding:10px 14px; font-weight:600; font-size:14px; white-space:nowrap}
.pp-add:hover{background:#173d27}

.pp-why{display:inline-flex; align-items:center; gap:7px; background:none; border:none; color:var(--green-mid); font-weight:600; font-size:13px; padding:4px 0; margin-bottom:2px}
.pp-why .rot{transform:rotate(180deg)}
.pp-why svg{transition:transform .2s}
.pp-whybody{background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:16px 18px; margin:8px 0 18px; font-size:14px}
.pp-whybody p{margin:0 0 10px}
.pp-whygrid{display:grid; gap:8px; margin-bottom:8px}
.pp-whygrid>div{display:flex; gap:9px; align-items:baseline; color:var(--ink)}
.pp-pill{font-family:var(--fm); font-size:11px; font-weight:600; padding:2px 8px; border-radius:6px; flex:0 0 auto}
.pp-pill.green{background:#E6F0DD; color:var(--green)}
.pp-pill.amber{background:var(--amber-soft); color:#8a5d12}
.pp-fine{font-size:12px; color:var(--soft); margin:0}
.pp-fine.center{text-align:center; margin-top:20px}

.pp-controls{display:flex; flex-wrap:wrap; gap:12px 18px; align-items:center; margin-bottom:12px}
.pp-searchwrap{display:flex; align-items:center; gap:8px; background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:0 10px; flex:1 1 240px; color:var(--soft)}
.pp-searchwrap input{border:none; outline:none; background:none; padding:10px 0; font-size:14px; width:100%; color:var(--ink); font-family:var(--fb)}
.pp-clear{background:none; border:none; color:var(--soft); display:grid; place-items:center; padding:2px}
.pp-typerow{display:flex; flex-wrap:wrap; gap:6px}
.pp-chip{border:1px solid var(--line); background:var(--surface); color:var(--soft); border-radius:20px; padding:7px 13px; font-size:13px; font-weight:500; display:inline-flex; align-items:center; gap:5px}
.pp-chip:hover{border-color:var(--sprout)}
.pp-chip.on{background:var(--green); color:#fff; border-color:var(--green)}
.pp-chip.fav.on{background:var(--amber); border-color:var(--amber)}
.pp-sortrow{display:flex; align-items:center; gap:5px}
.pp-sortlabel{font-size:12px; color:var(--soft); margin-right:2px}
.pp-sort{border:none; background:none; color:var(--soft); font-size:13px; font-weight:600; padding:5px 8px; border-radius:7px}
.pp-sort.on{background:#E6F0DD; color:var(--green)}

.pp-tagrow{display:flex; flex-wrap:wrap; gap:6px; margin-bottom:14px}
.pp-tag{font-family:var(--fm); font-size:11px; border:1px dashed var(--line); background:none; color:var(--soft); border-radius:7px; padding:4px 9px; display:inline-flex; align-items:center; gap:4px}
.pp-tag:hover{border-color:var(--sprout); color:var(--green-mid)}
.pp-tag.on{background:var(--green); color:#fff; border-style:solid; border-color:var(--green)}
.pp-tag.clear{border-style:solid; color:var(--danger); border-color:transparent; text-decoration:underline}

.pp-count{font-family:var(--fm); font-size:12px; color:var(--soft); margin:0 0 12px}

.pp-grid{display:grid; grid-template-columns:repeat(auto-fill,minmax(244px,1fr)); gap:14px}
.pp-card{background:var(--surface); border:1px solid var(--line); border-radius:16px; padding:15px 16px 14px; cursor:pointer; transition:transform .15s, box-shadow .15s, border-color .15s; display:flex; flex-direction:column; gap:9px}
.pp-card:hover{transform:translateY(-2px); box-shadow:0 10px 24px -16px rgba(22,36,27,.4); border-color:var(--sprout)}
.pp-cardtop{display:flex; justify-content:space-between; align-items:center}
.pp-type{font-family:var(--fm); font-size:10.5px; font-weight:600; letter-spacing:.04em; text-transform:uppercase; padding:3px 8px; border-radius:6px}
.t-breakfast{background:#FBEED6; color:#8a5d12}
.t-lunch{background:#E1EFD5; color:#3a6b2c}
.t-dinner{background:#DCE9E2; color:#1f5039}
.t-snack{background:#EDE4F1; color:#6a4878}
.pp-star{background:none; border:none; color:#C7CFC0; display:grid; place-items:center; padding:2px}
.pp-star:hover{color:var(--amber)}
.pp-star.on{color:var(--amber)}
.pp-name{font-size:16.5px; font-weight:700; line-height:1.2; color:var(--ink)}
.pp-spec{display:flex; flex-wrap:wrap; gap:4px 12px; font-family:var(--fm); font-size:11px; color:var(--soft); align-items:center}
.pp-spec b{color:var(--green); font-weight:600}
.pp-spec span{display:inline-flex; align-items:center; gap:4px}
.pp-spec.detail{font-size:12px; margin-top:4px}
.pp-dots{display:inline-flex; gap:2px}
.pp-dots i{width:5px; height:5px; border-radius:50%; background:#D2DAC9; display:inline-block}
.pp-dots i.f{background:var(--amber)}
.pp-cardtags{display:flex; flex-wrap:wrap; gap:5px; margin-top:auto}
.pp-cardtags span{font-family:var(--fm); font-size:10px; color:var(--green-mid); background:#EAF1E2; padding:2px 7px; border-radius:5px}
.pp-cardtags span.mine{background:var(--amber-soft); color:#8a5d12}

.pp-empty{text-align:center; padding:50px 20px; color:var(--soft)}
.pp-empty svg{color:var(--sprout); margin-bottom:8px}
.pp-empty p{margin:2px 0}

.pp-pantry{margin-top:26px; background:var(--surface); border:1px solid var(--line); border-radius:16px; overflow:hidden}
.pp-pantrytoggle{width:100%; display:flex; justify-content:space-between; align-items:center; background:none; border:none; padding:15px 18px; font-family:var(--fd); font-weight:700; font-size:15px; color:var(--green)}
.pp-pantrytoggle span{display:inline-flex; align-items:center; gap:8px}
.pp-pantrytoggle .rot{transform:rotate(180deg)}
.pp-pantrytoggle svg{transition:transform .2s}
.pp-pantrybody{padding:0 18px 18px}
.pp-pantrygrid{display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:16px; margin-top:12px}
.pp-pantrygrid h5{font-size:12px; text-transform:uppercase; letter-spacing:.05em; color:var(--amber); margin-bottom:6px}
.pp-pantrygrid ul{list-style:none; margin:0; padding:0}
.pp-pantrygrid li{font-size:13px; color:var(--ink); padding:2px 0}

.pp-overlay{position:fixed; inset:0; background:rgba(22,36,27,.5); backdrop-filter:blur(3px); display:flex; align-items:flex-start; justify-content:center; padding:24px 16px; overflow-y:auto; z-index:50}
.pp-modal{background:var(--surface); border-radius:20px; max-width:640px; width:100%; padding:26px 26px 28px; position:relative; box-shadow:0 30px 60px -20px rgba(22,36,27,.5); margin:auto}
.pp-close{position:absolute; top:16px; right:16px; background:#F1F5EC; border:none; border-radius:9px; width:34px; height:34px; display:grid; place-items:center; color:var(--soft)}
.pp-close:hover{background:#E6F0DD; color:var(--ink)}
.pp-detailtop{display:flex; justify-content:space-between; align-items:center; padding-right:40px}
.pp-detailbtns{display:flex; gap:6px}
.pp-star.big{color:#C7CFC0} .pp-star.big.on{color:var(--amber)}
.pp-del{background:none; border:none; color:#C7B0AA; padding:2px; display:grid; place-items:center}
.pp-del:hover{color:var(--danger)}
.pp-detailname{font-size:24px; font-weight:800; color:var(--ink); margin-top:10px; line-height:1.12}
.pp-whyline{display:flex; gap:8px; align-items:baseline; font-size:13.5px; color:var(--green-mid); background:#EAF1E2; padding:10px 13px; border-radius:11px; margin:14px 0 18px}
.pp-whyline svg{flex:0 0 auto; position:relative; top:2px; color:var(--green-mid)}
.pp-cols{display:grid; grid-template-columns:1fr 1.2fr; gap:24px}
.pp-cols h4{font-size:12px; text-transform:uppercase; letter-spacing:.05em; color:var(--amber); margin-bottom:8px}
.pp-ing{list-style:none; margin:0; padding:0}
.pp-ing li{font-size:14px; padding:4px 0 4px 16px; position:relative; border-bottom:1px solid var(--line)}
.pp-ing li:before{content:''; position:absolute; left:2px; top:11px; width:6px; height:6px; border-radius:50%; background:var(--sprout)}
.pp-steps{margin:0; padding-left:20px}
.pp-steps li{font-size:14px; padding:3px 0 7px}
.pp-steps li::marker{color:var(--amber); font-family:var(--fm); font-weight:600}

.pp-form{display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:14px}
.pp-form label{display:flex; flex-direction:column; gap:5px; font-size:12px; font-weight:600; color:var(--soft)}
.pp-form label.full{grid-column:1 / -1}
.pp-form input,.pp-form select,.pp-form textarea{font-family:var(--fb); font-size:14px; color:var(--ink); border:1px solid var(--line); border-radius:9px; padding:9px 11px; background:#FBFDF9; font-weight:400}
.pp-form textarea{resize:vertical; line-height:1.45}
.pp-formbtns{display:flex; justify-content:flex-end; gap:10px; margin-top:18px}
.pp-ghost{background:none; border:1px solid var(--line); color:var(--soft); border-radius:10px; padding:10px 16px; font-weight:600; font-size:14px}
.pp-save{background:var(--green); border:none; color:#fff; border-radius:10px; padding:10px 18px; font-weight:600; font-size:14px}
.pp-save:disabled{opacity:.4; cursor:not-allowed}
.pp-save:not(:disabled):hover{background:#173d27}

.pp-reset{display:flex; align-items:center; gap:6px; margin:26px auto 0; background:none; border:none; color:var(--soft); font-size:12px; text-decoration:underline}
.pp-reset:hover{color:var(--danger)}

@media (max-width:560px){
  .pp-header h1{font-size:25px}
  .pp-cols{grid-template-columns:1fr; gap:18px}
  .pp-form{grid-template-columns:1fr}
  .pp-add span{display:none}
}
@media (prefers-reduced-motion:reduce){
  .pp-card,.pp-why svg,.pp-pantrytoggle svg{transition:none}
  .pp-card:hover{transform:none}
}
`;

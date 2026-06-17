/* Build a categorized, quantity-merged shopping list from a set of planned meals.

   Recipe ingredients are free text ("½ cup rolled oats", "1 onion, diced"), so this
   parses each line into { value, unit, name }, groups by a normalized name, sums
   quantities that share a unit (and lists distinct amounts when units differ — no
   risky cup↔tbsp conversion), then sorts items into store sections. */

const FRACS = {
  "½": 1 / 2, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 1 / 4, "¾": 3 / 4,
  "⅛": 1 / 8, "⅜": 3 / 8, "⅝": 5 / 8, "⅞": 7 / 8, "⅙": 1 / 6, "⅚": 5 / 6,
};
const FRAC_CHARS = "½⅓⅔¼¾⅛⅜⅝⅞⅙⅚";

const UNIT_CANON = {
  cup: "cup", cups: "cup", tbsp: "tbsp", tablespoon: "tbsp", tablespoons: "tbsp",
  tsp: "tsp", teaspoon: "tsp", teaspoons: "tsp", can: "can", cans: "can",
  clove: "clove", cloves: "clove", block: "block", blocks: "block",
  handful: "handful", handfuls: "handful", oz: "oz", ounce: "oz", ounces: "oz",
  head: "head", heads: "head", stalk: "stalk", stalks: "stalk",
  slice: "slice", slices: "slice", pinch: "pinch", pinches: "pinch",
  bunch: "bunch", sprig: "sprig", sprigs: "sprig",
};
const UNIT_PLURAL = {
  cup: "cups", can: "cans", clove: "cloves", block: "blocks", handful: "handfuls",
  head: "heads", stalk: "stalks", slice: "slices", pinch: "pinches", bunch: "bunches",
  sprig: "sprigs",
};

const PREP = new Set([
  "diced", "minced", "sliced", "chopped", "drained", "halved", "crumbled", "grated",
  "julienned", "shredded", "cubed", "rinsed", "cooked", "wedged", "quartered",
  "juiced", "torn", "peeled", "to serve", "to taste", "for serving", "optional",
  "finely diced", "thinly sliced", "patted dry", "in wedges", "drained and dried",
  "drained and patted dry", "rinsed", "sliced thin", "to garnish", "florets",
]);

// adjectives dropped only for the grouping KEY (so "firm tofu" merges with "tofu")
const KEY_QUALIFIERS = /\b(fresh|natural|low-fat|low-sodium|firm|frozen|cooked|dried|ground|whole|small|large|ripe|mixed|plain|canned|raw)\b/g;

// leading vague-amount phrases ("a few", "pinch of", "squeeze of"…)
const LEADING_AMOUNT =
  /^(a few |a handful of |a handful |small handful |large handful |big handful |handful of |a |few |some |couple of |couple |pinch of |pinch |dash of |dash |splash of |splash |squeeze of |squeeze |drizzle of |drizzle |several )/i;

// trailing serving phrases without a comma ("… to serve")
const TRAILING_PHRASE = /\s+(to serve|to taste|to garnish|for serving|to thin)\b.*$/i;

// store sections, in match-priority order (first keyword hit wins)
const MATCH_ORDER = [
  ["Legumes & beans", ["lentil", "chickpea", "edamame", "kidney bean", "pinto bean",
    "cannellini", "black bean", "white bean", "bean", "hummus", "dal"]],
  ["Grains & bread", ["rolled oat", "steel-cut oat", "oat", "brown rice", "rice",
    "quinoa", "spaghetti", "pasta", "soba", "barley", "bulgur", "tortilla", "pita",
    "bread", "toast", "noodle", "couscous"]],
  ["Nuts, seeds & fats", ["peanut butter", "walnut", "almond", "cashew", "tahini",
    "chia", "flax", "sesame oil", "sesame seed", "sesame", "olive oil", "avocado oil",
    "oil", "nut"]],
  ["Protein & tofu", ["tofu", "tempeh", "egg", "seitan"]],
  ["Dairy & alternatives", ["soy milk", "low-fat milk", "milk", "yogurt"]],
  ["Pantry & spices", ["black pepper", "pepper flake", "peppercorn", "cayenne", "salt",
    "cumin", "smoked paprika", "paprika", "chili powder", "chili", "curry", "turmeric",
    "oregano", "cinnamon", "vanilla", "soy sauce", "rice vinegar", "vinegar",
    "vegetable broth", "veg broth", "broth", "stock", "tomato paste", "diced tomato",
    "crushed tomato", "canned tomato", "maple", "honey", "mustard", "salsa", "bay leaf",
    "red pepper", "ginger powder", "garlic powder", "spice"]],
  ["Produce", ["onion", "garlic", "carrot", "celery", "bell pepper", "pepper",
    "spinach", "kale", "tomato", "sweet potato", "potato", "banana", "lemon", "lime",
    "apple", "avocado", "cucumber", "scallion", "mushroom", "zucchini", "broccoli",
    "greens", "parsley", "mint", "cilantro", "ginger", "berry", "berries", "corn",
    "cabbage", "date", "olive", "lettuce", "squash", "pea", "herb"]],
];

// display order of sections
export const SECTION_ORDER = [
  "Produce", "Legumes & beans", "Grains & bread", "Protein & tofu",
  "Nuts, seeds & fats", "Dairy & alternatives", "Pantry & spices", "Other",
];

function parseQuantity(str) {
  let s = str.trim();
  let value = null;
  let m;
  if ((m = s.match(/^(\d+)\s+(\d+)\/(\d+)\b/))) { value = +m[1] + +m[2] / +m[3]; s = s.slice(m[0].length); }
  else if ((m = s.match(/^(\d+)\/(\d+)\b/))) { value = +m[1] / +m[2]; s = s.slice(m[0].length); }
  else if ((m = s.match(new RegExp(`^(\\d+)\\s*([${FRAC_CHARS}])`)))) { value = +m[1] + FRACS[m[2]]; s = s.slice(m[0].length); }
  else if ((m = s.match(new RegExp(`^([${FRAC_CHARS}])`)))) { value = FRACS[m[1]]; s = s.slice(m[1].length); }
  else if ((m = s.match(/^(\d+(?:\.\d+)?)/))) { value = +m[1]; s = s.slice(m[0].length); }
  s = s.trim();

  let unit = null;
  const um = s.match(/^([a-zA-Z]+)\b/);
  if (um && UNIT_CANON[um[1].toLowerCase()]) {
    unit = UNIT_CANON[um[1].toLowerCase()];
    s = s.slice(um[0].length).trim();
  }
  return { value, unit, rest: s };
}

function stripPrep(name) {
  const parts = name.split(",").map((p) => p.trim()).filter(Boolean);
  while (parts.length > 1 && PREP.has(parts[parts.length - 1].toLowerCase())) parts.pop();
  return parts.join(", ");
}

function cleanName(name) {
  let n = name.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  n = n.replace(TRAILING_PHRASE, "").trim();
  n = n.replace(LEADING_AMOUNT, "").trim();
  n = stripPrep(n);
  return n.replace(/[.,;]+$/, "").trim();
}

function normWords(name) {
  return name.toLowerCase().replace(KEY_QUALIFIERS, " ").replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ").trim();
}

// light singularization for grouping only (carrots→carrot, berries→berry, tomatoes→tomato)
function singular(w) {
  if (w.length <= 3) return w;
  if (/(ss|us|is)$/.test(w)) return w; // hummus, etc.
  if (/ies$/.test(w)) return w.slice(0, -3) + "y";
  if (/(oes|ches|shes|xes)$/.test(w)) return w.slice(0, -2);
  if (/s$/.test(w)) return w.slice(0, -1);
  return w;
}
function mergeKeyOf(norm) {
  return norm.split(" ").map(singular).join(" ");
}

// category is matched on the non-singularized text so plural keywords still hit
function categoryFor(norm) {
  for (const [cat, words] of MATCH_ORDER) {
    if (words.some((w) => norm.includes(w))) return cat;
  }
  return "Other";
}

function titleCase(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// split a line into separate purchasable items on " & " (e.g. "Salt & black pepper")
function splitLine(line) {
  return line.split(/\s+&\s+|\s+and\s+(?=black pepper|pepper)/i).map((p) => p.trim()).filter(Boolean);
}

function fmtValue(v) {
  const whole = Math.floor(v + 1e-6);
  let frac = v - whole;
  const table = [
    [0, ""], [1 / 8, "⅛"], [1 / 4, "¼"], [1 / 3, "⅓"], [3 / 8, "⅜"], [1 / 2, "½"],
    [5 / 8, "⅝"], [2 / 3, "⅔"], [3 / 4, "¾"], [7 / 8, "⅞"], [1, ""],
  ];
  let best = table[0], bestD = Infinity;
  for (const t of table) { const d = Math.abs(frac - t[0]); if (d < bestD) { bestD = d; best = t; } }
  let w = whole, sym = best[1];
  if (best[0] === 1) w += 1;
  if (w === 0 && sym) return sym;
  if (w === 0 && !sym) return "0";
  return sym ? `${w}${sym}` : `${w}`;
}

function amountString(entries) {
  // bucket summable entries by unit; entries with a value but no unit = count bucket
  const buckets = new Map(); // unit|"#" -> sum
  let hasUnparsed = false;
  for (const e of entries) {
    if (e.value == null) { hasUnparsed = true; continue; }
    const k = e.unit || "#";
    buckets.set(k, (buckets.get(k) || 0) + e.value);
  }
  const parts = [];
  for (const [u, sum] of buckets) {
    if (u === "#") { parts.push(fmtValue(sum)); continue; }
    const label = sum > 1 ? (UNIT_PLURAL[u] || u) : u;
    parts.push(`${fmtValue(sum)} ${label}`);
  }
  if (!parts.length && hasUnparsed) return "";
  return parts.join(" · ");
}

// entries: [{ meal, batches }] — ingredient amounts are scaled by `batches`
// (how many times that recipe is cooked to cover its days in the plan).
export function buildShoppingList(entries) {
  const groups = new Map(); // key -> { display, entries:[], meals:Set }
  for (const { meal, batches = 1 } of entries) {
    if (!meal || !Array.isArray(meal.ingredients)) continue;
    for (const rawLine of meal.ingredients) {
      for (const piece of splitLine(rawLine)) {
        const cleaned = cleanName(piece);
        if (!cleaned) continue;
        // a no-quantity comma list ("Carrots, cucumber, bell pepper") is several items
        const hasQty = new RegExp(`^[\\d${FRAC_CHARS}]`).test(cleaned);
        const subItems = !hasQty && cleaned.includes(",")
          ? cleaned.split(",").map((s) => s.trim()).filter(Boolean)
          : [cleaned];
        for (const sub of subItems) {
          const { value, unit, rest } = parseQuantity(sub);
          // re-strip a vague amount left after a number ("1 large handful spinach")
          let name = (rest || sub).replace(LEADING_AMOUNT, "").trim();
          if (!name) continue;
          if (name.toLowerCase() === "pepper") name = "black pepper"; // seasoning, not bell pepper
          const norm = normWords(name);
          const mkey = mergeKeyOf(norm);
          if (!mkey || mkey === "water" || mkey === "ice") continue;
          if (!groups.has(mkey)) groups.set(mkey, { display: name, norm, entries: [], meals: new Set() });
          const g = groups.get(mkey);
          g.entries.push({ value: value == null ? null : value * batches, unit });
          g.meals.add(meal.name);
          // prefer the shortest variant as the display name (more generic)
          if (name.length < g.display.length) g.display = name;
        }
      }
    }
  }

  const sections = new Map(SECTION_ORDER.map((s) => [s, []]));
  for (const [key, g] of groups) {
    const item = {
      key,
      name: titleCase(g.display),
      amount: amountString(g.entries),
      mealCount: g.meals.size,
      meals: [...g.meals],
      category: categoryFor(g.norm),
    };
    sections.get(item.category).push(item);
  }

  return SECTION_ORDER
    .map((name) => ({ name, items: sections.get(name).sort((a, b) => a.name.localeCompare(b.name)) }))
    .filter((s) => s.items.length > 0);
}

// Regenerate public/meals.json from the authored source in src/seedMeals.js.
// Run with: npm run gen:meals
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { SEED_MEALS, SERVINGS } from "../src/seedMeals.js";
import { FAMILY_MEALS } from "../src/familyMeals.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public");
mkdirSync(outDir, { recursive: true });

// Embed each recipe's servings estimate so the deployed meals.json is self-describing.
const seed = SEED_MEALS.map((m) => ({
  ...m,
  servings: m.servings ?? SERVINGS[m.id] ?? (m.type === "Dinner" ? 4 : 2),
}));
const meals = [...seed, ...FAMILY_MEALS];

const outFile = path.join(outDir, "meals.json");
writeFileSync(outFile, JSON.stringify(meals, null, 2) + "\n");

console.log(`Wrote ${path.relative(root, outFile)} with ${meals.length} meals (${FAMILY_MEALS.length} family).`);

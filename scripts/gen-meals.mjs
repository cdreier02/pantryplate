// Regenerate public/meals.json from the authored source in src/seedMeals.js.
// Run with: npm run gen:meals
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { SEED_MEALS } from "../src/seedMeals.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public");
mkdirSync(outDir, { recursive: true });

const outFile = path.join(outDir, "meals.json");
writeFileSync(outFile, JSON.stringify(SEED_MEALS, null, 2) + "\n");

console.log(`Wrote ${path.relative(root, outFile)} with ${SEED_MEALS.length} meals.`);

// Offline sanity test for the OFF<->Monster name matcher. No network.
// Run: node scripts/test-match.mjs
import assert from "node:assert";
import { scoreNames, bestMatch } from "./lib/match.mjs";

let passed = 0;
function check(desc, cond) {
  assert.ok(cond, `FAILED: ${desc}`);
  passed++;
}

// Realistic OFF product names (how OFF tends to label Monster products).
const off = [
  { name: "Monster Energy Mango Loco", code: "1" },
  { name: "Monster Energy Pipeline Punch", code: "2" },
  { name: "Monster Ultra Paradise", code: "3" },
  { name: "Monster Ultra Gold", code: "4" },
  { name: "Monster Energy Ultra Violet", code: "5" },
  { name: "Monster Ultra Rosa", code: "6" },
  { name: "Monster Ultra Fiesta Mango", code: "7" },
  { name: "Monster Energy Aussie Style Lemonade", code: "8" },
  { name: "Red Bull Watermelon", code: "9" }, // decoy, must never match
];

// Canonical Monster names -> expected OFF code (or null = should stay unmatched).
const cases = [
  ["Juice Monster Mango Loco", "1"],
  ["Juice Monster Pipeline Punch", "2"],
  ["Zero-Sugar Ultra Paradise", "3"],
  ["Zero-Sugar Ultra Gold", "4"],
  ["Zero-Sugar Ultra Violet", "5"],
  ["Zero-Sugar Ultra Rosá", "6"], // accent must normalize to match "Rosa"
  ["Zero-Sugar Ultra Fiesta Mango", "7"],
  ["Aussie Lemonade", "8"],
  // Boilerplate-only names have no distinctive token -> documented as unmatchable.
  ["Zero Sugar Monster Energy", null],
  ["The Original Monster Energy Super-Premium Import", null],
];

for (const [canonical, expected] of cases) {
  const m = bestMatch(canonical, off, 0.4);
  const got = m ? m.candidate.code : null;
  check(`${canonical} -> ${expected ?? "(none)"} (got ${got})`, got === expected);
}

// A flavored name must not cross-match a different flavor.
check("Mango Loco vs Pipeline Punch scores 0", scoreNames("Mango Loco", "Pipeline Punch") === 0);
// Fiesta Mango should prefer its own OFF entry, not Mango Loco.
check(
  "Fiesta Mango picks code 7 not 1",
  bestMatch("Zero-Sugar Ultra Fiesta Mango", off, 0.4).candidate.code === "7"
);
// The decoy brand never wins.
check(
  "Aussie Lemonade never matches Red Bull",
  bestMatch("Aussie Lemonade", off, 0.4).candidate.code !== "9"
);

console.log(`All ${passed} matcher assertions passed.`);

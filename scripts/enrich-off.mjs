#!/usr/bin/env node
// Cross-references our Monster catalog (from Parse.bot) against Open Food Facts
// to fill the gaps Monster's site doesn't provide: barcode, caffeine, sugar,
// volume. Monster stays canonical -- we only fill NULL fields, never overwrite
// name/description/flavor_profile/image/line.
//
// DRY RUN BY DEFAULT. Name matching is fuzzy (OFF shares no key with Monster),
// so it prints proposed matches for you to eyeball. Pass --apply to write.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// Usage:
//   node --env-file=.env scripts/enrich-off.mjs           # dry run
//   node --env-file=.env scripts/enrich-off.mjs --apply    # write null-fills

import { createClient } from "@supabase/supabase-js";
import { bestMatch } from "./lib/match.mjs";

const APPLY = process.argv.includes("--apply");
const SOURCE = "parsebot_monster";
const THRESHOLD = 0.4;

function requireEnv(name) {
  const v = process.env[name];
  if (!v) { console.error(`Missing env var: ${name}`); process.exit(1); }
  return v;
}

function parseVolumeMl(q) {
  if (!q) return null;
  const m = String(q).match(/([\d.]+)\s*(ml|l)\b/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return m[2].toLowerCase() === "l" ? Math.round(n * 1000) : Math.round(n);
}

// OFF nutriments are inconsistent. Prefer a per-serving value; else derive from
// per-100ml and the volume. Clamp to a sane range and drop anything absurd.
function deriveMg(nutriments, key, volumeMl) {
  if (!nutriments) return null;
  const serving = nutriments[`${key}_serving`];
  if (serving != null && Number.isFinite(+serving)) return clampMg(+serving);
  const per100 = nutriments[`${key}_100g`];
  if (per100 != null && volumeMl) return clampMg((+per100 / 100) * volumeMl);
  return null;
}
function clampMg(v) {
  const r = Math.round(v);
  return r > 0 && r <= 1000 ? r : null;
}
function deriveGrams(nutriments, key, volumeMl) {
  if (!nutriments) return null;
  const serving = nutriments[`${key}_serving`];
  if (serving != null && Number.isFinite(+serving)) return round2(+serving);
  const per100 = nutriments[`${key}_100g`];
  if (per100 != null && volumeMl) return round2((+per100 / 100) * volumeMl);
  return null;
}
const round2 = (v) => Math.round(v * 100) / 100;

async function fetchOff() {
  const url =
    "https://world.openfoodfacts.org/api/v2/search?brands_tags=monster-energy" +
    "&page_size=200&fields=code,product_name,quantity,nutriments";
  const res = await fetch(url, {
    headers: { "User-Agent": "EnergyAtlas-Enrich/0.1 (dev tool)" },
  });
  if (!res.ok) throw new Error(`OFF request failed: ${res.status} ${res.statusText}`);
  const data = await res.json();
  return (data.products ?? []).filter((p) => p.code && p.product_name);
}

async function main() {
  const supabase = createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } }
  );

  const { data: flavors, error } = await supabase
    .from("flavors")
    .select("id, name, barcode, caffeine_mg, sugar_g, volume_ml")
    .eq("source", SOURCE);
  if (error) throw error;

  console.log(`${flavors.length} Monster flavors. Fetching OFF candidates...`);
  const candidates = (await fetchOff()).map((p) => ({ ...p, name: p.product_name }));
  console.log(`${candidates.length} OFF products.\n`);
  console.log(APPLY ? "APPLY mode: writing null-fills.\n" : "DRY RUN (pass --apply to write).\n");

  let matched = 0, unmatched = 0, wrote = 0;

  for (const f of flavors) {
    const m = bestMatch(f.name, candidates, THRESHOLD);
    if (!m) {
      unmatched++;
      console.log(`  —  ${f.name}  (no OFF match)`);
      continue;
    }
    matched++;
    const off = m.candidate;
    const vol = f.volume_ml ?? parseVolumeMl(off.quantity);

    // Only propose values for columns that are currently null.
    const fill = {};
    if (f.barcode == null && off.code) fill.barcode = off.code;
    if (f.volume_ml == null && parseVolumeMl(off.quantity) != null)
      fill.volume_ml = parseVolumeMl(off.quantity);
    if (f.caffeine_mg == null) {
      const c = deriveMg(off.nutriments, "caffeine", vol);
      if (c != null) fill.caffeine_mg = c;
    }
    if (f.sugar_g == null) {
      const s = deriveGrams(off.nutriments, "sugars", vol);
      if (s != null) fill.sugar_g = s;
    }

    const fillStr = Object.keys(fill).length
      ? Object.entries(fill).map(([k, v]) => `${k}=${v}`).join(", ")
      : "(nothing to fill)";
    console.log(`  ✓  ${f.name}\n       ~ ${off.product_name}  [score ${m.score}]\n       ${fillStr}`);

    if (APPLY && Object.keys(fill).length) {
      const { error: upErr } = await supabase.from("flavors").update(fill).eq("id", f.id);
      if (upErr) console.log(`       ! write failed: ${upErr.message}`);
      else wrote++;
    }
  }

  console.log(`\nMatched ${matched}, unmatched ${unmatched}${APPLY ? `, wrote ${wrote}` : ""}.`);
  if (!APPLY) console.log("Re-run with --apply once the matches above look right.");
}

main().catch((err) => { console.error(err); process.exit(1); });

#!/usr/bin/env node
// Seeds `brands` and `flavors` from Open Food Facts, by brand tag.
//
// This is a bootstrap tool, not a sync job: Open Food Facts coverage of
// imports/limited editions is spotty, so expect to hand-fix and hand-add
// a chunk of the catalog after running this. It gets you unblocked from
// zero, it doesn't replace curation.
//
// Usage:
//   SUPABASE_URL=http://127.0.0.1:54321 \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   npm run seed:off -- --brand-name "Monster Energy" --brand-tag monster-energy
//
// Get the service role key from `npx supabase status` (local) or the
// dashboard (hosted). Never ship this key in the app -- it bypasses RLS.

import { createClient } from "@supabase/supabase-js";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
      args[key] = value;
    }
  }
  return args;
}

function parseVolumeMl(quantity) {
  if (!quantity) return null;
  const match = String(quantity).match(/([\d.]+)\s*(ml|l)\b/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  return match[2].toLowerCase() === "l" ? Math.round(value * 1000) : Math.round(value);
}

function parseCaffeineMg(nutriments, volumeMl) {
  // OFF reports caffeine per 100g/ml when present; energy drinks are close
  // enough to 1g/ml that per-100ml is a reasonable stand-in for per-100g.
  const per100 = nutriments?.["caffeine_100g"];
  if (per100 == null || !volumeMl) return null;
  return Math.round((per100 / 100) * volumeMl);
}

async function fetchOffProducts(brandTag, pageSize) {
  const url =
    `https://world.openfoodfacts.org/api/v2/search?` +
    `brands_tags=${encodeURIComponent(brandTag)}&page_size=${pageSize}&` +
    `fields=code,product_name,quantity,nutriments,image_front_url,brands`;

  const res = await fetch(url, {
    headers: { "User-Agent": "EnergyAtlas-SeedScript/0.1 (dev tool)" },
  });
  if (!res.ok) {
    throw new Error(`Open Food Facts request failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data.products ?? [];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const brandName = args["brand-name"];
  const brandTag = args["brand-tag"];
  const pageSize = args["page-size"] ?? "100";

  if (!brandName || !brandTag) {
    console.error(
      "Usage: npm run seed:off -- --brand-name \"Monster Energy\" --brand-tag monster-energy"
    );
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  console.log(`Fetching "${brandTag}" products from Open Food Facts...`);
  const products = await fetchOffProducts(brandTag, pageSize);
  console.log(`Got ${products.length} products.`);

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .upsert({ name: brandName }, { onConflict: "name" })
    .select()
    .single();
  if (brandError) throw brandError;

  let inserted = 0;
  let skipped = 0;

  for (const product of products) {
    if (!product.code || !product.product_name) {
      skipped++;
      continue;
    }
    const volumeMl = parseVolumeMl(product.quantity);
    const flavor = {
      brand_id: brand.id,
      name: product.product_name,
      barcode: product.code,
      volume_ml: volumeMl,
      caffeine_mg: parseCaffeineMg(product.nutriments, volumeMl),
      image_url: product.image_front_url ?? null,
    };

    const { error } = await supabase.from("flavors").upsert(flavor, { onConflict: "barcode" });
    if (error) {
      console.warn(`Skipping ${product.code} (${product.product_name}): ${error.message}`);
      skipped++;
    } else {
      inserted++;
    }
  }

  console.log(`Done. Upserted ${inserted}, skipped ${skipped}.`);
  console.log(
    "Now go check what's actually in the catalog -- OFF data is inconsistent " +
      "(missing quantity/caffeine, wrong product names) and imports/limited " +
      "editions won't show up here at all."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env node
// Daily sync of the Monster catalog from a Parse.bot scraper into our own
// database + Storage. The app never calls Parse.bot -- it only reads the rows
// and images this job writes. Run it on a schedule (cron); see README.
//
// What it does per run:
//   1. GET the scraper's list_drinks endpoint.
//   2. For each drink: download the can webp, upload it into our `can-images`
//      Storage bucket, and upsert the flavor row (idempotent on source_slug)
//      pointing image_url at OUR stored copy.
//
// Required env:
//   SUPABASE_URL              admin API base (e.g. http://127.0.0.1:54321)
//   SUPABASE_SERVICE_ROLE_KEY service role key (bypasses RLS; never ship it)
//   PARSEBOT_API_KEY          the Parse.bot X-API-Key
// Optional env:
//   PARSEBOT_SCRAPER_URL      full list_drinks URL (defaults to the Monster one)
//   PUBLIC_BASE_URL           host to build stored image URLs with. Defaults to
//                             SUPABASE_URL, but the app reaches Supabase over a
//                             different host (e.g. Tailscale IP), and images are
//                             loaded by the *phone* -- so set this to whatever
//                             EXPO_PUBLIC_SUPABASE_URL is, or the phone 404s.

import { createClient } from "@supabase/supabase-js";

const BUCKET = "can-images";
const SOURCE = "parsebot_monster";
// No category param => the scraper returns every drink across all categories.
const DEFAULT_SCRAPER_URL =
  "https://api.parse.bot/scraper/26ea289b-92e5-458c-8f1d-16a061bd4d27/list_drinks";

// The scraper's category is Monster's product line; map it to our line_name.
const LINE_BY_CATEGORY = {
  "monster-energy": "Original",
  "monster-ultra": "Ultra",
  "juice-monster": "Juice",
};

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

// "150 mg" -> 150 ; null/"" -> null
function parseIntUnit(value) {
  if (value == null) return null;
  const m = String(value).match(/([\d.]+)/);
  return m ? Math.round(parseFloat(m[1])) : null;
}

// "550 ml" / "1 l" -> ml ; null -> null
function parseVolumeMl(value) {
  if (value == null) return null;
  const m = String(value).match(/([\d.]+)\s*(ml|l)\b/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return m[2].toLowerCase() === "l" ? Math.round(n * 1000) : Math.round(n);
}

function parseNumber(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function fetchDrinks(scraperUrl, apiKey) {
  const res = await fetch(scraperUrl, { headers: { "X-API-Key": apiKey } });
  if (!res.ok) {
    throw new Error(`Parse.bot request failed: ${res.status} ${res.statusText}`);
  }
  const body = await res.json();
  if (body.status !== "success" || !body.data?.drinks) {
    throw new Error(`Unexpected Parse.bot payload: ${JSON.stringify(body).slice(0, 300)}`);
  }
  return body.data.drinks;
}

async function uploadCanImage(supabase, publicBase, slug, imageUrl) {
  if (!imageUrl) return null;
  const res = await fetch(imageUrl);
  if (!res.ok) {
    console.warn(`  ! image fetch failed (${res.status}) for ${slug}, skipping image`);
    return null;
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  const path = `monster/${slug}.webp`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: "image/webp", upsert: true });
  if (error) {
    console.warn(`  ! image upload failed for ${slug}: ${error.message}`);
    return null;
  }
  // Build the public URL against the host the *app* uses, not necessarily the
  // admin URL this script talks to.
  return `${publicBase.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${path}`;
}

async function main() {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const apiKey = requireEnv("PARSEBOT_API_KEY");
  const scraperUrl = process.env.PARSEBOT_SCRAPER_URL || DEFAULT_SCRAPER_URL;
  const publicBase = process.env.PUBLIC_BASE_URL || supabaseUrl;

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  console.log("Fetching drinks from Parse.bot...");
  const drinks = await fetchDrinks(scraperUrl, apiKey);
  console.log(`Got ${drinks.length} drinks.`);

  const { data: brand, error: brandErr } = await supabase
    .from("brands")
    .upsert({ name: "Monster Energy" }, { onConflict: "name" })
    .select()
    .single();
  if (brandErr) throw brandErr;

  let upserted = 0;
  let failed = 0;

  for (const drink of drinks) {
    if (!drink.slug || !drink.name) {
      console.warn(`  ! skipping drink with no slug/name: ${JSON.stringify(drink).slice(0, 120)}`);
      failed++;
      continue;
    }
    console.log(`- ${drink.name} (${drink.slug})`);
    const imageUrl = await uploadCanImage(supabase, publicBase, drink.slug, drink.can_image_url);

    const row = {
      brand_id: brand.id,
      source: SOURCE,
      source_slug: drink.slug,
      name: drink.name,
      line_name: LINE_BY_CATEGORY[drink.category] ?? null,
      description: drink.description ?? null,
      flavor_profile: drink.flavor_profile ?? null,
      caffeine_mg: parseIntUnit(drink.caffeine),
      volume_ml: parseVolumeMl(drink.serving_size),
      sugar_g: parseNumber(drink.sugar),
      image_url: imageUrl,
    };

    const { error } = await supabase
      .from("flavors")
      .upsert(row, { onConflict: "source,source_slug" });
    if (error) {
      console.warn(`  ! upsert failed for ${drink.slug}: ${error.message}`);
      failed++;
    } else {
      upserted++;
    }
  }

  console.log(`\nDone. Upserted ${upserted}, failed ${failed}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

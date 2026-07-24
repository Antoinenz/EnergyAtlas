// Pure, dependency-free name matching between Monster's canonical catalog
// (Parse.bot) and Open Food Facts products. No network here so it can be unit
// tested offline (see scripts/test-match.mjs).
//
// The problem: OFF has no shared key with Monster's site (Monster gives no
// barcode), so we match on names. Names are noisy on both sides, so we strip
// brand/marketing boilerplate down to the distinctive flavor tokens and score
// the overlap.

// Words that appear across many products and carry no flavor signal.
const STOPWORDS = new Set([
  "monster", "energy", "drink", "the", "aka", "a", "k", "super", "premium",
  "import", "zero", "sugar", "official", "can", "cans", "ml", "l", "of",
]);

// Line words are meaningful but common within a line; kept, but a match must
// share at least one NON-line token so we never match on "ultra" alone.
// (green/white are NOT here -- they're the distinctive part of "Original
// Green" / "White Monster".)
const LINE_WORDS = new Set(["ultra", "juice", "original"]);

export function normalizeTokens(name) {
  if (!name) return [];
  return String(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // drop accents: rosá -> rosa
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t && !STOPWORDS.has(t));
}

function distinctiveTokens(tokens) {
  return tokens.filter((t) => !LINE_WORDS.has(t));
}

// Jaccard overlap of token sets, but only valid if the two share a distinctive
// (non-line) token. Returns 0..1.
export function scoreNames(a, b) {
  const ta = new Set(normalizeTokens(a));
  const tb = new Set(normalizeTokens(b));
  if (ta.size === 0 || tb.size === 0) return 0;

  const da = new Set(distinctiveTokens([...ta]));
  const db = new Set(distinctiveTokens([...tb]));
  const sharedDistinctive = [...da].some((t) => db.has(t));
  if (!sharedDistinctive) return 0;

  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = ta.size + tb.size - inter;
  return inter / union;
}

// Pick the best OFF candidate for a canonical name. `candidates` is an array of
// { name, ...rest }. Returns { candidate, score } or null below threshold.
export function bestMatch(canonicalName, candidates, threshold = 0.4) {
  let best = null;
  let bestScore = 0;
  for (const c of candidates) {
    const s = scoreNames(canonicalName, c.name);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  return best && bestScore >= threshold
    ? { candidate: best, score: Number(bestScore.toFixed(3)) }
    : null;
}

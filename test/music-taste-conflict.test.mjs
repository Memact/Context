import test from "node:test";
import assert from "node:assert/strict";
import {
  SOURCE_TYPE_WEIGHTS,
  sourceTypeWeight,
  normaliseGenres,
  computeOverlap,
  computeConfidenceDelta,
  detectMusicTasteConflict,
  resolveMusicTasteConflict
} from "../src/music-taste-conflict.mjs";

// ---------------------------------------------------------------------------
// sourceTypeWeight
// ---------------------------------------------------------------------------

test("sourceTypeWeight returns highest weight for media-playback", () => {
  assert.equal(sourceTypeWeight("media-playback"), SOURCE_TYPE_WEIGHTS["media-playback"]);
  assert.ok(sourceTypeWeight("media-playback") > sourceTypeWeight("social-community"));
});

test("sourceTypeWeight handles alias listening-history", () => {
  assert.equal(sourceTypeWeight("listening-history"), SOURCE_TYPE_WEIGHTS["listening-history"]);
});

test("sourceTypeWeight handles alias self-reported", () => {
  assert.equal(sourceTypeWeight("self-reported"), SOURCE_TYPE_WEIGHTS["self-reported"]);
});

test("sourceTypeWeight returns unknown weight for unrecognised source", () => {
  assert.equal(sourceTypeWeight("made-up-source"), SOURCE_TYPE_WEIGHTS["unknown"]);
  assert.equal(sourceTypeWeight(""), SOURCE_TYPE_WEIGHTS["unknown"]);
  assert.equal(sourceTypeWeight(), SOURCE_TYPE_WEIGHTS["unknown"]);
});

// ---------------------------------------------------------------------------
// normaliseGenres
// ---------------------------------------------------------------------------

test("normaliseGenres deduplicates and lowercases", () => {
  const result = normaliseGenres(["Hip-Hop", "hip-hop", "Jazz", "jazz"]);
  assert.deepEqual(result, ["hip-hop", "jazz"]);
});

test("normaliseGenres accepts a comma-separated string", () => {
  const result = normaliseGenres("Pop, Rock, Hip-Hop");
  assert.deepEqual(result, ["hip-hop", "pop", "rock"]);
});

test("normaliseGenres handles empty input", () => {
  assert.deepEqual(normaliseGenres([]), []);
  assert.deepEqual(normaliseGenres(""), []);
  assert.deepEqual(normaliseGenres(), []);
});

test("normaliseGenres trims whitespace from each genre", () => {
  const result = normaliseGenres(["  metal  ", " jazz "]);
  assert.deepEqual(result, ["jazz", "metal"]);
});

// ---------------------------------------------------------------------------
// computeOverlap (Jaccard)
// ---------------------------------------------------------------------------

test("computeOverlap returns 1 for identical sets", () => {
  assert.equal(computeOverlap(["rock", "jazz"], ["rock", "jazz"]), 1);
});

test("computeOverlap returns 0 for fully disjoint sets", () => {
  assert.equal(computeOverlap(["rock"], ["jazz"]), 0);
});

test("computeOverlap returns correct Jaccard for partial overlap", () => {
  // intersection={pop}, union={pop,rock,jazz} → 1/3
  const result = computeOverlap(["pop", "rock"], ["pop", "jazz"]);
  assert.ok(Math.abs(result - 1 / 3) < 0.001, `Expected ~0.333, got ${result}`);
});

test("computeOverlap returns 1 for two empty arrays", () => {
  assert.equal(computeOverlap([], []), 1);
});

// ---------------------------------------------------------------------------
// computeConfidenceDelta
// ---------------------------------------------------------------------------

test("computeConfidenceDelta is positive when analytics leads", () => {
  const analyticsClaim = { confidence: 0.9, source_type: "media-playback" };
  const statedClaim    = { confidence: 0.6, source_type: "social-community" };
  const delta = computeConfidenceDelta(analyticsClaim, statedClaim);
  assert.ok(delta > 0, `Expected positive delta, got ${delta}`);
});

test("computeConfidenceDelta is negative when stated leads", () => {
  const analyticsClaim = { confidence: 0.3, source_type: "media-playback" };
  const statedClaim    = { confidence: 0.9, source_type: "social-community" };
  const delta = computeConfidenceDelta(analyticsClaim, statedClaim);
  assert.ok(delta < 0, `Expected negative delta, got ${delta}`);
});

test("computeConfidenceDelta uses default weights when source_type is omitted", () => {
  const delta = computeConfidenceDelta({ confidence: 0.8 }, { confidence: 0.5 });
  // analytics default = media-playback (0.9), stated default = social-community (0.55)
  // 0.8*0.9 - 0.5*0.55 = 0.72 - 0.275 = 0.445
  assert.ok(Math.abs(delta - (0.8 * 0.9 - 0.5 * 0.55)) < 0.001);
});

// ---------------------------------------------------------------------------
// detectMusicTasteConflict — no conflict cases
// ---------------------------------------------------------------------------

test("detectMusicTasteConflict returns null when both genre lists are empty", () => {
  const result = detectMusicTasteConflict(
    { genres: [], source_type: "media-playback", confidence: 0.9 },
    { genres: [], source_type: "social-community", confidence: 0.6 }
  );
  assert.equal(result, null);
});

test("detectMusicTasteConflict returns null when genres overlap sufficiently", () => {
  // Identical genres → overlap = 1.0 → no conflict
  const result = detectMusicTasteConflict(
    { genres: ["pop", "rock"], source_type: "media-playback", confidence: 0.9 },
    { genres: ["pop", "rock"], source_type: "social-community", confidence: 0.6 }
  );
  assert.equal(result, null);
});

test("detectMusicTasteConflict returns null when delta is below threshold even with genre divergence", () => {
  // Disjoint genres but tiny confidence delta → no conflict surface
  const result = detectMusicTasteConflict(
    { genres: ["metal"], source_type: "media-playback", confidence: 0.31 },
    { genres: ["jazz"],  source_type: "social-community", confidence: 0.55 },
    { deltaThreshold: 0.50 }  // very high threshold
  );
  assert.equal(result, null);
});

// ---------------------------------------------------------------------------
// detectMusicTasteConflict — conflict detected
// ---------------------------------------------------------------------------

test("detectMusicTasteConflict detects Spotify vs Discord contradiction", () => {
  // Spotify streams: hip-hop, trap, drill
  // Discord bio: classical, jazz
  const analyticsClaim = {
    genres: ["hip-hop", "trap", "drill"],
    source_type: "media-playback",
    source_label: "Spotify",
    confidence: 0.9
  };
  const statedClaim = {
    genres: ["classical", "jazz"],
    source_type: "social-community",
    source_label: "Discord",
    confidence: 0.7
  };

  const result = detectMusicTasteConflict(analyticsClaim, statedClaim);

  assert.ok(result !== null, "Should detect a conflict");
  assert.equal(result.conflict_type, "music_taste_contradiction");
  assert.equal(result.analytics_source, "Spotify");
  assert.equal(result.stated_source, "Discord");
  assert.ok(result.overlap_score < 0.35, `Overlap should be below threshold, got ${result.overlap_score}`);
  assert.ok(Math.abs(result.confidence_delta) >= 0.20);
  assert.ok(result.requires_user_review === true);
  assert.ok(typeof result.summary === "string" && result.summary.length > 0);
});

test("detectMusicTasteConflict populates genres_only_in_analytics and genres_only_in_stated", () => {
  const result = detectMusicTasteConflict(
    { genres: ["hip-hop", "trap"], source_type: "media-playback", confidence: 0.85 },
    { genres: ["classical"],       source_type: "social-community", confidence: 0.6 }
  );

  assert.ok(result !== null);
  assert.ok(result.genres_only_in_analytics.includes("hip-hop"));
  assert.ok(result.genres_only_in_analytics.includes("trap"));
  assert.ok(result.genres_only_in_stated.includes("classical"));
});

test("detectMusicTasteConflict sets leading_source to analytics when analytics weighted confidence is higher", () => {
  const result = detectMusicTasteConflict(
    { genres: ["hip-hop"], source_type: "media-playback",   confidence: 0.95, source_label: "Spotify" },
    { genres: ["classical"], source_type: "social-community", confidence: 0.6,  source_label: "Discord" }
  );
  assert.ok(result !== null);
  assert.equal(result.leading_source, "Spotify");
});

test("detectMusicTasteConflict returns a contradiction_proposal with two resolution options", () => {
  const result = detectMusicTasteConflict(
    { genres: ["metal", "punk"], source_type: "media-playback",   confidence: 0.88, source_label: "Spotify" },
    { genres: ["pop", "indie"],  source_type: "social-community", confidence: 0.65, source_label: "Discord" }
  );

  assert.ok(result !== null);
  const proposal = result.contradiction_proposal;
  assert.ok(proposal, "Should have a contradiction_proposal");
  assert.equal(proposal.field_path, "music.taste_conflict");
  assert.equal(proposal.category, "music-streaming");
  assert.ok(Array.isArray(proposal.options) && proposal.options.length === 2);
  const values = proposal.options.map(o => o.value);
  assert.ok(values.includes("analytics"));
  assert.ok(values.includes("stated"));
});

test("detectMusicTasteConflict normalises genre casing before comparison", () => {
  // Both say "Hip-Hop" (uppercase H) vs "hip-hop" — should match → no conflict
  const result = detectMusicTasteConflict(
    { genres: ["Hip-Hop", "Pop"], source_type: "media-playback",   confidence: 0.9 },
    { genres: ["hip-hop", "pop"], source_type: "social-community", confidence: 0.6 }
  );
  assert.equal(result, null, "Case-normalised identical genres should not conflict");
});

test("detectMusicTasteConflict respects custom thresholds", () => {
  // Normally this would not conflict, but with very permissive thresholds it should
  const result = detectMusicTasteConflict(
    { genres: ["rock", "blues"], source_type: "media-playback",   confidence: 0.9 },
    { genres: ["jazz"],          source_type: "social-community", confidence: 0.5 },
    { overlapThreshold: 0.99, deltaThreshold: 0.01 }
  );
  assert.ok(result !== null, "Should conflict with permissive thresholds");
});

// ---------------------------------------------------------------------------
// resolveMusicTasteConflict
// ---------------------------------------------------------------------------

test("resolveMusicTasteConflict resolves to analytics genres when userChoice is 'analytics'", () => {
  const conflict = detectMusicTasteConflict(
    { genres: ["hip-hop", "trap"], source_type: "media-playback",   confidence: 0.9,  source_label: "Spotify" },
    { genres: ["classical"],       source_type: "social-community", confidence: 0.65, source_label: "Discord" }
  );
  assert.ok(conflict !== null);

  const resolution = resolveMusicTasteConflict(conflict, "analytics");

  assert.equal(resolution.resolution, "analytics");
  assert.deepEqual(resolution.accepted_genres, conflict.analytics_genres);
  assert.equal(resolution.lifecycle_action, "user_confirmed");
  assert.equal(resolution.field_path, "music.taste_preferences");
  assert.ok(typeof resolution.resolved_at === "string");
});

test("resolveMusicTasteConflict resolves to stated genres when userChoice is 'stated'", () => {
  const conflict = detectMusicTasteConflict(
    { genres: ["hip-hop"], source_type: "media-playback",   confidence: 0.9 },
    { genres: ["classical"], source_type: "social-community", confidence: 0.6 }
  );
  assert.ok(conflict !== null);

  const resolution = resolveMusicTasteConflict(conflict, "stated");

  assert.equal(resolution.resolution, "stated");
  assert.deepEqual(resolution.accepted_genres, conflict.stated_genres);
  assert.equal(resolution.rejected_source, conflict.analytics_source);
});

test("resolveMusicTasteConflict throws TypeError for invalid conflict report", () => {
  assert.throws(
    () => resolveMusicTasteConflict({}, "analytics"),
    TypeError
  );
});

test("resolveMusicTasteConflict throws RangeError for invalid userChoice", () => {
  const conflict = detectMusicTasteConflict(
    { genres: ["hip-hop"], source_type: "media-playback",   confidence: 0.9 },
    { genres: ["classical"], source_type: "social-community", confidence: 0.6 }
  );
  assert.throws(
    () => resolveMusicTasteConflict(conflict, "invalid"),
    RangeError
  );
});

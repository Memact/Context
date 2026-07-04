import test from "node:test";
import assert from "node:assert/strict";
import {
  category,
  contextFields,
  SENSITIVE_FIELDS,
  normalizeMusicContext,
  rawInputExamples,
  normalizedOutputExamples,
  proposalOutputExamples,
  sensitiveFieldRules,
  permissionSuggestions,
  careNotes,
  wikiEntryTemplates,
  generateWikiEntries
} from "../../src/categories/music-streaming.mjs";

test("music-streaming - category metadata and exports exist", () => {
  assert.equal(category, "music-streaming");
  assert.ok(contextFields.favorite_genres);
  assert.ok(contextFields.favorite_artists);
  assert.ok(contextFields.listening_context);
  assert.ok(contextFields.skipped_styles);
  assert.ok(contextFields.track_history);
});

test("music-streaming - raw and normalized examples are defined", () => {
  assert.ok(Array.isArray(rawInputExamples) && rawInputExamples.length > 0);
  assert.ok(Array.isArray(normalizedOutputExamples) && normalizedOutputExamples.length > 0);
  assert.ok(Array.isArray(proposalOutputExamples) && proposalOutputExamples.length > 0);
});

test("music-streaming - sensitiveFieldRules drops biometric and gps fields", () => {
  assert.equal(sensitiveFieldRules.biometric_response.action, "drop");
  assert.equal(sensitiveFieldRules.exact_gps_at_playback.action, "drop");
  assert.equal(sensitiveFieldRules.track_history.expires_after_days, 7);
  assert.equal(sensitiveFieldRules.track_history.approval_required, true);
  assert.equal(sensitiveFieldRules.skipped_styles.expires_after_days, 30);
  assert.equal(sensitiveFieldRules.skipped_styles.approval_required, false);
});

test("music-streaming - permissionSuggestions mapping matches target sensitivities", () => {
  assert.equal(permissionSuggestions.favorite_genres, "low");
  assert.equal(permissionSuggestions.favorite_artists, "low");
  assert.equal(permissionSuggestions.listening_context, "low");
  assert.equal(permissionSuggestions.skipped_styles, "medium");
  assert.equal(permissionSuggestions.track_history, "high");
});

test("music-streaming - careNotes contains activity is not identity and mood guides", () => {
  assert.ok(careNotes.length >= 4);
  assert.ok(careNotes.some(note => note.includes("not a preference")));
  assert.ok(careNotes.some(note => note.includes("mood")));
});

test("music-streaming - normalizeMusicContext drops sensitive fields", () => {
  const input = {
    source: "spotify",
    type: "activity",
    data: {
      track: "Bones",
      exact_gps_at_playback: "12.34, 56.78",
      biometric_response: "high heart rate"
    }
  };
  const result = normalizeMusicContext(input);
  assert.equal(result.category, "music-streaming");
  assert.equal(result.data.exact_gps_at_playback, undefined);
  assert.equal(result.data.biometric_response, undefined);
  assert.equal(result.data.track, "Bones");
});

test("music-streaming - normalizeMusicContext activity vs preference rules", () => {
  const activityInput = { source: "spotify", type: "activity", data: { action: "listen", track: "Summer" } };
  const actRes = normalizeMusicContext(activityInput);
  assert.equal(actRes.observation_type, "weak_observation");
  assert.equal(actRes.confidence, "low");
  assert.equal(actRes.needs_review, true);

  const prefExplicit = { source: "spotify", type: "preference", explicit: true, data: { favorite_genres: ["Pop"] } };
  const prefExpRes = normalizeMusicContext(prefExplicit);
  assert.equal(prefExpRes.observation_type, "explicit_preference");
  assert.equal(prefExpRes.confidence, "high");
  assert.equal(prefExpRes.needs_review, false);

  const prefInferred = { source: "spotify", type: "preference", explicit: false, data: { favorite_genres: ["Pop"] } };
  const prefInfRes = normalizeMusicContext(prefInferred);
  assert.equal(prefInfRes.observation_type, "inferred_preference");
  assert.equal(prefInfRes.confidence, "medium");
  assert.equal(prefInfRes.needs_review, true);
});

test("music-streaming - wikiEntryTemplates exist", () => {
  assert.ok(wikiEntryTemplates.length >= 3);
  assert.ok(wikiEntryTemplates.some(t => t.includes("favorite_genres")));
  assert.ok(wikiEntryTemplates.some(t => t.includes("favorite_artists")));
  assert.ok(wikiEntryTemplates.some(t => t.includes("skipped_styles")));
});

test("music-streaming - generateWikiEntries constructs correct structures", () => {
  const contextFlat = { favorite_genres: ["Jazz", "Blues"], favorite_artists: ["Miles Davis"], skipped_styles: ["Drill"] };
  const wikiFlat = generateWikiEntries(contextFlat);
  assert.equal(wikiFlat.length, 3);

  const genresEntry = wikiFlat.find(e => e.sub_type === "genres");
  assert.equal(genresEntry.proposed_text, "Enjoys listening to Jazz, Blues music while focusing.");
  assert.equal(genresEntry.confidence, 0.8);
  assert.equal(genresEntry.requires_user_confirmation, false);

  const artistsEntry = wikiFlat.find(e => e.sub_type === "artists");
  assert.equal(artistsEntry.proposed_text, "Frequently listens to Miles Davis during workouts.");

  const skippedEntry = wikiFlat.find(e => e.sub_type === "skipped_styles");
  assert.equal(skippedEntry.proposed_text, "Prefers to avoid Drill.");
  assert.equal(skippedEntry.confidence, 0.75);
  assert.equal(skippedEntry.requires_user_confirmation, true);

  const contextData = { data: { favorite_genres: ["Rock"] } };
  const wikiData = generateWikiEntries(contextData);
  assert.equal(wikiData.length, 1);
  assert.equal(wikiData[0].proposed_text, "Enjoys listening to Rock music while focusing.");
});

test('music-streaming - normalizeMusicContext traces Spotify dynamic playlist queries and weights', (t) => {
  // 1. Intercept console.info
  const originalConsoleInfo = console.info;
  let traceOutput = null;
  
  console.info = (msg) => {
    traceOutput = JSON.parse(msg);
  };

  // 2. Execute a mock Spotify query
  const mockSpotifyQuery = {
    source: "spotify.com",
    type: "preference",
    data: {
      favorite_artists: ["Diljit Dosanjh", "Kishore Kumar"],
      listening_context: "workout"
    }
  };

  const result = normalizeMusicContext(mockSpotifyQuery);

  // 3. Restore console immediately to prevent test runner interference
  console.info = originalConsoleInfo;

  // 4. Assertions
  assert.ok(traceOutput, 'Tracer should have fired for Spotify source');
  assert.strictEqual(traceOutput.event, 'SPOTIFY_DYNAMIC_PLAYLIST_QUERY', 'Event name must match');
  assert.strictEqual(traceOutput.matching_weight, 'high', 'Should correctly log the confidence weight');
  assert.deepStrictEqual(
    traceOutput.query_parameters.favorite_artists, 
    ["Diljit Dosanjh", "Kishore Kumar"], 
    'Should log the sanitized query parameters'
  );
  
  // Ensure the core engine return value wasn't mutated
  assert.strictEqual(result.category, 'music-streaming');
});

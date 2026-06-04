import test from "node:test";
import assert from "node:assert/strict";
import { normalizeReadingActivity, generateWikiEntries } from "../src/categories/news-articles.mjs";

test("Durable Interest Graduation: topic with >= 3 reads across >= 2 days graduates", () => {
  const rawEvents = [
    {
      id: "1",
      topics: ["Gaming"],
      action: "read",
      occurred_at: "2026-05-01T10:00:00Z"
    },
    {
      id: "2",
      topics: ["Gaming"],
      action: "read",
      occurred_at: "2026-05-01T15:00:00Z"
    },
    {
      id: "3",
      topics: ["Gaming"],
      action: "read",
      occurred_at: "2026-05-02T10:00:00Z"
    }
  ];

  const result = normalizeReadingActivity(rawEvents);
  
  // Verify Gaming has graduated to durable interests
  const gamingDurable = result.durable_interests.find(i => i.topic === "Gaming");
  assert.ok(gamingDurable, "Gaming topic should have graduated to durable interests");
  assert.equal(gamingDurable.article_count, 3);
  assert.equal(gamingDurable.distinct_days, 2);
  assert.ok(gamingDurable.confidence > 0.7, "Gaming durable interest should have high confidence");

  // Verify Gaming is not in temporary interests
  const gamingTemp = result.temporary_interests.find(i => i.topic === "Gaming");
  assert.ok(!gamingTemp, "Gaming should not be in temporary interests");
});

test("Temporary Curiosity Containment: single click remains low confidence temporary interest", () => {
  const rawEvents = [
    {
      id: "1",
      topics: ["Space Exploration"],
      action: "read",
      occurred_at: "2026-05-01T10:00:00Z"
    }
  ];

  const result = normalizeReadingActivity(rawEvents);
  
  // Verify Space Exploration is temporary, not durable
  const spaceDurable = result.durable_interests.find(i => i.topic === "Space Exploration");
  assert.ok(!spaceDurable, "One-off read should not graduate to durable interest");

  const spaceTemp = result.temporary_interests.find(i => i.topic === "Space Exploration");
  assert.ok(spaceTemp, "One-off read should remain in temporary interests");
  assert.equal(spaceTemp.article_count, 1);
  assert.equal(spaceTemp.distinct_days, 1);
  assert.equal(spaceTemp.reason, "curiosity_click");
  assert.equal(spaceTemp.confidence, 0.4);
});

test("Temporary Curiosity Containment: single-day research binge remains temporary", () => {
  const rawEvents = [
    {
      id: "1",
      topics: ["React Native"],
      action: "read",
      occurred_at: "2026-05-01T10:00:00Z"
    },
    {
      id: "2",
      topics: ["React Native"],
      action: "read",
      occurred_at: "2026-05-01T11:00:00Z"
    },
    {
      id: "3",
      topics: ["React Native"],
      action: "read",
      occurred_at: "2026-05-01T12:00:00Z"
    },
    {
      id: "4",
      topics: ["React Native"],
      action: "read",
      occurred_at: "2026-05-01T13:00:00Z"
    }
  ];

  const result = normalizeReadingActivity(rawEvents);
  
  // Verify React Native is temporary despite 4 reads, because they occurred on the same day
  const rnDurable = result.durable_interests.find(i => i.topic === "React Native");
  assert.ok(!rnDurable, "Same-day research binge should not graduate to durable interest");

  const rnTemp = result.temporary_interests.find(i => i.topic === "React Native");
  assert.ok(rnTemp, "Same-day research binge should remain in temporary interests");
  assert.equal(rnTemp.article_count, 4);
  assert.equal(rnTemp.distinct_days, 1);
  assert.equal(rnTemp.reason, "single_day_research_binge");
  assert.ok(rnTemp.confidence < 0.6, "Research binge should have limited confidence");
});

test("Sensitive Topic Guardrails: politics and health reads do not become durable interests, cap confidence, flag user confirmation", () => {
  const rawEvents = [
    {
      id: "1",
      topics: ["Global Politics"],
      action: "read",
      occurred_at: "2026-05-01T10:00:00Z"
    },
    {
      id: "2",
      topics: ["Global Politics"],
      action: "read",
      occurred_at: "2026-05-02T10:00:00Z"
    },
    {
      id: "3",
      topics: ["Global Politics"],
      action: "read",
      occurred_at: "2026-05-03T10:00:00Z"
    }
  ];

  const result = normalizeReadingActivity(rawEvents);
  
  // Verify Politics topic is treated with extra care
  const polDurable = result.durable_interests.find(i => i.topic === "Global Politics");
  assert.ok(!polDurable, "Sensitive topic should never automatically graduate to durable interest");

  const polTemp = result.temporary_interests.find(i => i.topic === "Global Politics");
  assert.ok(polTemp, "Sensitive topic should remain in temporary interests for protection");
  assert.equal(polTemp.requires_user_confirmation, true, "Sensitive topic must flag requires_user_confirmation");
  assert.equal(polTemp.reason, "sensitive_topic_protection");
  assert.ok(polTemp.confidence <= 0.4, "Sensitive topic confidence must be capped at 0.4");
});

test("Preference Mapping: correct extraction of publisher, length, format, and cadence preferences", () => {
  const rawEvents = [
    {
      id: "1",
      topics: ["Cooking"],
      publisher: "FoodNetwork",
      length_minutes: 2,
      format: "summary",
      action: "read",
      occurred_at: "2026-05-01T08:00:00Z"
    },
    {
      id: "2",
      topics: ["Cooking"],
      publisher: "FoodNetwork",
      length_minutes: 1,
      format: "summary",
      action: "read",
      occurred_at: "2026-05-02T08:30:00Z"
    }
  ];

  const result = normalizeReadingActivity(rawEvents);
  
  assert.deepEqual(result.reading_preferences.preferred_publishers, ["FoodNetwork"]);
  assert.deepEqual(result.reading_preferences.preferred_article_lengths, ["short"]);
  assert.deepEqual(result.reading_preferences.preferred_formats, ["summaries"]);
  assert.equal(result.reading_preferences.reading_cadence, "morning_reader");
});

test("Skipped and Saved Articles: correctly traces skip and save actions", () => {
  const rawEvents = [
    {
      id: "1",
      title: "How to Cook Pasta",
      topics: ["Cooking"],
      action: "save",
      url: "https://example.com/pasta",
      occurred_at: "2026-05-01T12:00:00Z"
    },
    {
      id: "2",
      title: "Boring Politics News",
      topics: ["Boring Politics"],
      action: "skip",
      occurred_at: "2026-05-01T12:05:00Z"
    }
  ];

  const result = normalizeReadingActivity(rawEvents);

  assert.equal(result.saved_articles.length, 1);
  assert.equal(result.saved_articles[0].title, "How to Cook Pasta");
  assert.equal(result.saved_articles[0].url, "https://example.com/pasta");
  
  assert.ok(result.skipped_topics.includes("boring politics"));
});

test("Wiki Wording Softening: generates non-identity, softened Wiki texts for durable and cadence preferences", () => {
  const rawEvents = [
    {
      id: "1",
      topics: ["Gaming"],
      action: "read",
      publisher: "GameSpot",
      occurred_at: "2026-05-01T08:00:00Z"
    },
    {
      id: "2",
      topics: ["Gaming"],
      action: "read",
      publisher: "GameSpot",
      occurred_at: "2026-05-02T08:30:00Z"
    },
    {
      id: "3",
      topics: ["Gaming"],
      action: "read",
      publisher: "GameSpot",
      occurred_at: "2026-05-03T08:45:00Z"
    }
  ];

  const context = normalizeReadingActivity(rawEvents);
  const wikiEntries = generateWikiEntries(context);

  const gamingDurable = wikiEntries.find(e => e.id === "wiki_durable_gaming");
  assert.ok(gamingDurable);
  assert.equal(gamingDurable.proposed_text, "Recently reads several articles about Gaming.");

  const cadencePref = wikiEntries.find(e => e.id === "wiki_pref_cadence");
  assert.ok(cadencePref);
  assert.equal(cadencePref.proposed_text, "Often reads articles in the morning.");
});

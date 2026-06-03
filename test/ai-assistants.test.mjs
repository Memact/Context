import test from "node:test";
import assert from "node:assert/strict";
import {
  category,
  contextFields,
  careNotes,
  permissionSuggestions,
  SENSITIVE_TOPIC_RULES,
  normalizeAssistantActivity,
  generateWikiEntries
} from "../src/categories/ai-assistants.mjs";

test("category is ai-assistants", () => {
  assert.equal(category, "ai-assistants");
});

test("context fields distinguish explicit preferences from inferred observations", () => {
  assert.ok("explicit_preferences" in contextFields);
  assert.ok("inferred_usage_patterns" in contextFields);
  assert.ok("explicitly_marked_context" in contextFields);
  assert.ok("explicitly_excluded_context" in contextFields);
  assert.ok("temporary_query_context" in contextFields);
});

test("valid case: explicit preference gets full confidence and explicit source", () => {
  const result = normalizeAssistantActivity([
    {
      event_type: "explicit_preference",
      preference_key: "coding_language",
      value: "TypeScript",
      occurred_at: "2026-05-01T10:00:00Z"
    }
  ]);

  assert.equal(result.explicit_preferences.length, 1);
  assert.equal(result.explicit_preferences[0].value, "TypeScript");
  assert.equal(result.explicit_preferences[0].confidence, 1.0);
  assert.equal(result.explicit_preferences[0].source, "explicit_user_statement");
});

test("valid case: inferred coding language requires at least 3 distinct sessions", () => {
  const twoSessions = [
    { event_type: "code_block", language: "python", occurred_at: "2026-05-01T10:00:00Z" },
    { event_type: "code_block", language: "python", occurred_at: "2026-05-02T10:00:00Z" }
  ];
  const twoResult = normalizeAssistantActivity(twoSessions);
  assert.equal(
    twoResult.inferred_usage_patterns.preferred_coding_languages.length,
    0,
    "2 sessions should not qualify as an inferred preference"
  );

  const threeSessions = [
    ...twoSessions,
    { event_type: "code_block", language: "python", occurred_at: "2026-05-03T10:00:00Z" }
  ];
  const threeResult = normalizeAssistantActivity(threeSessions);
  const python = threeResult.inferred_usage_patterns.preferred_coding_languages.find(
    l => l.language === "python"
  );
  assert.ok(python, "python should qualify after 3 distinct sessions");
  assert.equal(python.source, "inferred_usage_pattern");
  assert.ok(python.confidence < 1.0, "inferred pattern should have lower confidence than an explicit preference");
});

test("valid case: explicitly marked context is preserved and exposes actions", () => {
  const result = normalizeAssistantActivity([
    {
      event_type: "explicit_memory_request",
      content: "I work on an e-commerce backend using Node.js",
      occurred_at: "2026-05-01T10:00:00Z"
    }
  ]);

  assert.equal(result.explicitly_marked_context.length, 1);
  assert.equal(result.explicitly_marked_context[0].content, "I work on an e-commerce backend using Node.js");
  assert.equal(result.explicitly_marked_context[0].requires_user_confirmation, false);

  const wiki = generateWikiEntries(result);
  const markedEntry = wiki.find(e => e.type === "explicit_memory");
  assert.ok(markedEntry, "explicitly marked context should produce a wiki entry");
  assert.ok(markedEntry.actions.includes("edit"), "user must be able to edit the entry");
  assert.ok(markedEntry.actions.includes("delete"), "user must be able to delete the entry");
});

test("overbroad memory: single sensitive query must not become permanent context", () => {
  const result = normalizeAssistantActivity([
    {
      event_type: "query",
      topic: "depression symptoms and treatment options",
      occurred_at: "2026-05-01T10:00:00Z"
    }
  ]);

  assert.equal(result.temporary_context.length, 1);
  assert.equal(result.temporary_context[0].sensitive, true);
  assert.equal(result.temporary_context[0].requires_user_confirmation, true);
  assert.equal(result.explicit_preferences.length, 0);
  assert.equal(result.inferred_usage_patterns.preferred_coding_languages.length, 0);

  const wiki = generateWikiEntries(result);
  const sensitiveEntry = wiki.find(e =>
    e.proposed_text && e.proposed_text.toLowerCase().includes("depression")
  );
  assert.ok(!sensitiveEntry, "a single sensitive query should not produce any wiki entry");
});

test("overbroad memory: single-session code block does not produce an inferred language preference", () => {
  const result = normalizeAssistantActivity([
    { event_type: "code_block", language: "rust", occurred_at: "2026-05-01T10:00:00Z" }
  ]);

  assert.equal(result.inferred_usage_patterns.preferred_coding_languages.length, 0);

  const wiki = generateWikiEntries(result);
  const langEntry = wiki.find(e => e.sub_type === "coding_language");
  assert.ok(!langEntry, "one code block session should not generate a coding language wiki entry");
});

test("sensitive explicit memory request is flagged for user confirmation", () => {
  const result = normalizeAssistantActivity([
    {
      event_type: "explicit_memory_request",
      content: "I've been dealing with anxiety and want gentle responses",
      occurred_at: "2026-05-01T10:05:00Z"
    }
  ]);

  assert.equal(result.explicitly_marked_context.length, 1);
  assert.equal(
    result.explicitly_marked_context[0].requires_user_confirmation,
    true,
    "explicitly marked sensitive content should require user confirmation before becoming memory"
  );
});

test("explicitly excluded context is not surfaced in wiki entries", () => {
  const result = normalizeAssistantActivity([
    {
      event_type: "explicit_exclusion_request",
      content: "Do not remember anything about my health questions",
      occurred_at: "2026-05-01T10:00:00Z"
    }
  ]);

  assert.equal(result.explicitly_excluded_context.length, 1);

  const wiki = generateWikiEntries(result);
  assert.equal(wiki.length, 0, "excluded context must not generate any wiki entry");
});

test("sensitive topic detection recognizes mental health and personal topics", () => {
  assert.ok(SENSITIVE_TOPIC_RULES.isSensitive("therapy and depression resources"));
  assert.ok(SENSITIVE_TOPIC_RULES.isSensitive("grief counseling for loss"));
  assert.ok(SENSITIVE_TOPIC_RULES.isSensitive("anxiety management tips"));
  assert.ok(!SENSITIVE_TOPIC_RULES.isSensitive("typescript generics tutorial"));
  assert.ok(!SENSITIVE_TOPIC_RULES.isSensitive("react server components"));
});

test("care notes guard against raw conversation exposure and sensitive inference", () => {
  const hasRawGuard = careNotes.some(note =>
    note.toLowerCase().includes("raw conversation") || note.toLowerCase().includes("message history")
  );
  const hasSensitiveGuard = careNotes.some(note =>
    note.toLowerCase().includes("sensitive") || note.toLowerCase().includes("mental health")
  );
  assert.ok(hasRawGuard, "care notes must warn against exposing raw conversation content");
  assert.ok(hasSensitiveGuard, "care notes must warn against sensitive topic inference");
});

test("permission suggestions mark raw conversation history as high sensitivity", () => {
  assert.equal(permissionSuggestions.raw_conversation_history, "high");
  assert.equal(permissionSuggestions.explicit_preferences, "low");
});

import test from "node:test";
import assert from "node:assert/strict";
import { SchemaAdapter } from "../src/schema-adapter.mjs";
import { CATEGORIES } from "../src/registry.mjs";

test("SchemaAdapter lists all categories correctly", () => {
  const categories = SchemaAdapter.listCategories();
  assert.deepEqual(categories, CATEGORIES);
});

test("SchemaAdapter throws an error for unknown categories", async () => {
  await assert.rejects(
    () => SchemaAdapter.getSchema("non-existent-category"),
    /Unknown category: non-existent-category/
  );
});

test("SchemaAdapter normalizes Format 1 categories (e.g., fitness)", async () => {
  const schema = await SchemaAdapter.getSchema("fitness");

  assert.equal(schema.category, "fitness");
  
  // Verify sensitive fields
  assert.ok(schema.sensitiveFields.includes("allergies"));
  assert.ok(schema.sensitiveFields.includes("medical_restrictions"));

  // Verify durable preferences
  assert.ok(schema.durablePreferences.includes("goal"));
  assert.ok(schema.durablePreferences.includes("activity_level"));

  // Verify fields mapping
  assert.ok(schema.fields.goal);
  assert.equal(schema.fields.goal.name, "goal");
  assert.equal(schema.fields.goal.sensitive, false);
  assert.equal(schema.fields.goal.durable, true);

  assert.ok(schema.fields.allergies);
  assert.equal(schema.fields.allergies.name, "allergies");
  assert.equal(schema.fields.allergies.sensitive, true);
  assert.equal(schema.fields.allergies.durable, false);

  // Care notes
  assert.ok(Array.isArray(schema.careNotes));
});

test("SchemaAdapter normalizes Format 1 categories with contextFields (e.g., dining)", async () => {
  const schema = await SchemaAdapter.getSchema("dining");

  assert.equal(schema.category, "dining");
  assert.ok(schema.fields.preferred_cuisines);
  assert.equal(schema.fields.preferred_cuisines.description, "Favorite types of food or restaurants (e.g., Italian, Japanese, Vegan)");
  assert.equal(schema.fields.preferred_cuisines.sensitive, false);
  assert.equal(schema.fields.preferred_cuisines.durable, true); // No durable preferences set explicitly, so defaults to true

  assert.ok(schema.fields.dietary_restrictions);
  assert.equal(schema.fields.dietary_restrictions.sensitive, true);
});

test("SchemaAdapter normalizes Format 2 schema-driven categories (e.g., learning)", async () => {
  const schema = await SchemaAdapter.getSchema("learning");

  assert.equal(schema.category, "learning");
  assert.ok(schema.description.includes("learning preferences"));
  assert.ok(schema.productRule.includes("Learning context helps personalization"));

  // Verify fields from sections
  assert.ok(schema.fields.preferred_format);
  assert.equal(schema.fields.preferred_format.type, "enum");
  assert.deepEqual(schema.fields.preferred_format.allowedValues, ["text", "video", "quiz", "project", "mixed"]);
  assert.equal(schema.fields.preferred_format.sensitive, false);
  assert.equal(schema.fields.preferred_format.durable, true); // stable_preferences section is durable

  assert.ok(schema.fields.active_topics);
  assert.equal(schema.fields.active_topics.type, "Array<String>");
  assert.equal(schema.fields.active_topics.durable, false); // current_goals section is NOT durable
});

test("SchemaAdapter normalizes Format 2 schema-driven categories (e.g., gaming)", async () => {
  const schema = await SchemaAdapter.getSchema("gaming");

  assert.equal(schema.category, "gaming");
  assert.ok(schema.fields.preferred_genres);
  assert.equal(schema.fields.preferred_genres.type, "Array<String>");
  
  assert.ok(schema.fields.controller_setup);
  assert.equal(schema.fields.controller_setup.type, "enum");
  assert.deepEqual(schema.fields.controller_setup.allowedValues, ["keyboard_mouse", "gamepad", "touch", "mixed"]);
});

test("SchemaAdapter.getSchemas() resolves all categories in parallel", async () => {
  const schemas = await SchemaAdapter.getSchemas();

  assert.equal(Object.keys(schemas).length, CATEGORIES.length);
  for (const cat of CATEGORIES) {
    assert.ok(schemas[cat]);
    assert.equal(schemas[cat].category, cat);
    assert.ok(schemas[cat].fields);
  }
});

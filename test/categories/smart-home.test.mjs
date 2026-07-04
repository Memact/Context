import test from "node:test";
import assert from "node:assert/strict";
import {
  SMART_HOME_SCHEMA,
  SMART_HOME_PERMISSIONS,
  rawInputExamples,
  normalizedOutputExamples,
  normalizeSmartHomeContext,
  validateSmartHomeContext,
  generateWikiEntries
} from "../../src/categories/smart-home.mjs";

test("smart-home schema defines climate, lighting, and automation", () => {
  assert.equal(SMART_HOME_SCHEMA.category, "smart_home");
  assert.ok(SMART_HOME_SCHEMA.sections.climate_preferences);
  assert.ok(SMART_HOME_SCHEMA.sections.lighting_preferences);
  assert.ok(SMART_HOME_SCHEMA.sections.automation_rules);
});

test("smart-home examples exist", () => {
  assert.equal(rawInputExamples.length, 2);
  assert.equal(normalizedOutputExamples.length, 1);
});

test("normalizes valid smart-home context and extracts preferences", () => {
  const normalized = normalizeSmartHomeContext({
    target_temp_min: 22,
    target_temp_max: 26,
    temp_scale: "C",
    bulb_setting: "cool",
    brightness_level: 70,
    frequent_triggers: ["sunrise"]
  });

  assert.equal(normalized.category, "smart_home");
  assert.deepEqual(normalized.climate_preferences.thermostat_target_range, { min: 22, max: 26, scale: "C" });
  assert.equal(normalized.lighting_preferences.bulb_color_temperature, "cool");
  assert.equal(normalized.lighting_preferences.default_brightness, 70);
  assert.deepEqual(normalized.automation_rules.event_triggers, ["sunrise"]);

  const wiki = generateWikiEntries(normalized);
  assert.equal(wiki.length, 3);
});

test("unsafe security fields are dropped and flagged", () => {
  const normalized = normalizeSmartHomeContext({
    target_temp_min: 70,
    target_temp_max: 75,
    temp_scale: "F",
    security_camera_active: true,
    door_lock_status: "unlocked"
  });

  assert.ok(normalized.dropped_fields.includes("security_camera_active"));
  assert.ok(normalized.dropped_fields.includes("door_lock_status"));
  assert.equal(normalized.validation.ok, false);
  assert.equal(normalized.validation.reason, "unsafe_security_inference");

  const validation = validateSmartHomeContext({ door_lock_status: "open" });
  assert.equal(validation.ok, false);
});
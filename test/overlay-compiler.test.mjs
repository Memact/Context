import test from "node:test";
import assert from "node:assert/strict";
import { compileSchemaOverlay } from "../src/overlay-compiler.mjs";

test("Schema overlay compiler merges patches and evaluates live runtime inputs correctly", () => {
  const baseSchema = {
    category: "learning",
    sections: {
      stable_preferences: {
        fields: {
          preferred_format: { type: "enum", values: ["text", "video"] }
        }
      }
    }
  };

  const overlayPatch = {
    sections: {
      stable_preferences: {
        fields: {
          preferred_format: { values: ["text", "video", "quiz", "interactive_labs"] },
          session_streak: { type: "Number" }
        }
      }
    }
  };

  // Compile the dynamic overlay custom function
  const validate = compileSchemaOverlay(baseSchema, overlayPatch);

  // 1. Verify valid data extended by our overlay pass
  const validData = {
    stable_preferences: { preferred_format: "interactive_labs", session_streak: 12 }
  };
  const result1 = validate(validData);
  assert.equal(result1.ok, true);

  // 2. Verify invalid data violating type and enum constraints
  const invalidData = {
    stable_preferences: { preferred_format: "invalid_format_type", session_streak: "not_a_number" }
  };
  const result2 = validate(invalidData);
  assert.equal(result2.ok, false);
  assert.equal(result2.errors.length, 2);
});
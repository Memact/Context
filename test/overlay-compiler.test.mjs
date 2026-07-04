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

test("overlay-compiler - compileSchemaOverlay traces validation failures with path and format details", (t) => {
  // 1. Intercept console.error output streams safely
  const originalConsoleError = console.error;
  let traceOutput = null;

  console.error = (msg) => {
    try {
      traceOutput = JSON.parse(msg);
    } catch (e) {
      traceOutput = msg;
    }
  };

  // 2. Setup structural base schema definitions
  const baseSchema = {
    sections: {
      profile: {
        fields: {
          age: { type: "Number" },
          role: { type: "enum", values: ["admin", "user"] }
        }
      }
    }
  };

  const validate = compileSchemaOverlay(baseSchema, {});
  
  // 3. Inject explicit invalid formats to trigger constraints
  const invalidData = {
    profile: {
      age: "twenty-two",   // Expected number validation failure
      role: "super-admin"  // Out of bounds enum validation failure
    }
  };

  const result = validate(invalidData);

  // 4. Instantly restore global standard error logging state
  console.error = originalConsoleError;

  // 5. Verification Assertions
  assert.strictEqual(result.ok, false, "Validation status must evaluate to false");
  assert.ok(traceOutput, "Trace stream logger must output validation telemetry via console.error");
  assert.strictEqual(traceOutput.event, "SEMANTIC_OVERLAY_VALIDATION_FAILURE", "Telemetry tracer event identifier mismatch");
  assert.strictEqual(traceOutput.failures.length, 2, "Tracer failure collection length must capture all broken paths");

  // Validate path validation trace structure: profile.age
  const ageFailure = traceOutput.failures.find(f => f.path === "profile.age");
  assert.ok(ageFailure, "Missing tracking entry for path field profile.age");
  assert.strictEqual(ageFailure.error, "type_mismatch");
  assert.match(ageFailure.message, /Expected number/, "Trace message text should display expected formatting metadata");

  // Validate path validation trace structure: profile.role
  const roleFailure = traceOutput.failures.find(f => f.path === "profile.role");
  assert.ok(roleFailure, "Missing tracking entry for path field profile.role");
  assert.strictEqual(roleFailure.error, "invalid_enum_value");
  assert.match(roleFailure.message, /out of bounds/, "Trace message text should outline enum bound restrictions");
});

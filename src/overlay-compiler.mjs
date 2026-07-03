/**
 * Memact Context - Dynamic Schema Overlay Compiler
 * Issue #235 [Hard]
 */

/**
 * Compiles a base schema and an overlay patch into an optimized validation function.
 * @param {Object} baseSchema - The immutable default structural schema.
 * @param {Object} overlayPatch - Custom structural adjustments or new validation rules.
 * @returns {Function} A compiled, ultra-fast structural validator function.
 */
export function compileSchemaOverlay(baseSchema = {}, overlayPatch = {}) {
  // Deep-merge the base schema structure with the incoming customization overlay patch
  const compiledSchema = mergeDeep({}, baseSchema);
  mergeDeep(compiledSchema, overlayPatch);

  // Pre-compile evaluation sets and rules for hyper-fast execution runtimes
  const rules = [];

  if (compiledSchema.sections) {
    for (const [sectionName, section] of Object.entries(compiledSchema.sections)) {
      if (!section.fields) continue;

      for (const [fieldName, fieldConfig] of Object.entries(section.fields)) {
        const path = `${sectionName}.${fieldName}`;

        // 1. Compile Enum Validation Constraints
        if (fieldConfig.type === "enum" && Array.isArray(fieldConfig.values)) {
          const validSet = new Set(fieldConfig.values);
          rules.push((data, errors) => {
            const val = data[sectionName]?.[fieldName];
            if (val !== undefined && !validSet.has(val)) {
              errors.push({
                path,
                error: "invalid_enum_value",
                message: `Value '${val}' is out of bounds for enum fields [${fieldConfig.values.join(", ")}]`
              });
            }
          });
        }

        // 2. Compile Rigid Type Constraints
        if (fieldConfig.type === "Number") {
          rules.push((data, errors) => {
            const val = data[sectionName]?.[fieldName];
            if (val !== undefined && typeof val !== "number") {
              errors.push({ path, error: "type_mismatch", message: `Expected number, received ${typeof val}` });
            }
          });
        }
        if (fieldConfig.type === "Array<String>") {
          rules.push((data, errors) => {
            const val = data[sectionName]?.[fieldName];
            if (val !== undefined && (!Array.isArray(val) || !val.every(item => typeof item === "string"))) {
              errors.push({ path, error: "type_mismatch", message: "Expected a strict array of strings" });
            }
          });
        }

        // 3. Compile Custom Overlay Guardrails / Regex Patterns
        if (fieldConfig.pattern instanceof RegExp) {
          const regex = fieldConfig.pattern;
          rules.push((data, errors) => {
            const val = data[sectionName]?.[fieldName];
            if (val !== undefined && typeof val === "string" && !regex.test(val)) {
              errors.push({ path, error: "pattern_mismatch", message: `Field string value does not match custom overlay layout criteria` });
            }
          });
        }
      }
    }
  }

  // Return the sealed pre-compiled dynamic validator function
  return function validate(runtimeData = {}) {
    const errors = [];
    for (const rule of rules) {
      rule(runtimeData, errors);
    }

    // --- NEW: Semantic Overlay Validation Failure Trace Logger ---
    if (errors.length > 0) {
      const tracePayload = {
        event: "SEMANTIC_OVERLAY_VALIDATION_FAILURE",
        timestamp: new Date().toISOString(),
        failures: errors.map(err => ({
          path: err.path,
          error: err.error,
          message: err.message
        }))
      };
      console.error(JSON.stringify(tracePayload));
    }

    return {
      ok: errors.length === 0,
      errors,
      schemaSnapshot: compiledSchema
    };
  };
}

// Structural helper to deep clone and apply live overlay changes without mutation side-effects
function mergeDeep(target, source) {
  if (typeof target !== "object" || target === null || typeof source !== "object" || source === null) {
    return source;
  }
  for (const key of Object.keys(source)) {
    if (Array.isArray(source[key])) {
      target[key] = [...source[key]];
    } else if (typeof source[key] === "object" && source[key] !== null) {
      target[key] = mergeDeep(target[key] || {}, source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

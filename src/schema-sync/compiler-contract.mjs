import { createSchemaManifest, createSchemaArtifact, sha256Hex } from "./artifact-model.mjs";

/**
 * Compiler contract:
 * compileSchema(definition, options) => { manifest, artifact }
 *
 * The definition can be either:
 * - a category module export object (like FITNESS_CHALLENGES_SCHEMA)
 * - or a plain JSON schema definition
 */

export const DEFAULT_COMPILER_NAME = "memact.schema.compiler";

export function normalizeDefinition(definition) {
  if (!definition || typeof definition !== "object") {
    throw new Error("definition must be an object");
  }
  return definition;
}

export function compileSchema(definition, {
  compiler_version,
  output_schema_version = "schema-output.v1",
  source_ref = "unknown",
  compiler_name = DEFAULT_COMPILER_NAME,
  dependencies = []
} = {}) {
  const def = normalizeDefinition(definition);

  if (!compiler_version) throw new Error("options.compiler_version is required");

  // Input hash based on stable ordering.
  const input_hash = sha256Hex(JSON.stringify(def, Object.keys(def).sort()));

  const manifest = createSchemaManifest({
    source_ref,
    compiler_name,
    compiler_version,
    input_hash,
    output_schema_version,
    dependencies
  });

  // For this repo snapshot, "compiled output" is a validated JSON payload.
  // In a full implementation, you’d also attach JSON schema, validators, and any
  // codegen targets.
  const compiled_output = {
    schema_type: def.category || def.schema_type || "unknown",
    definition: def,
    validation_hints: {
      requires_user_confirmation: true
    }
  };

  const artifact = createSchemaArtifact({ manifest, compiled_output });
  return { manifest, artifact };
}


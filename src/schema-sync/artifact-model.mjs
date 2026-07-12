import crypto from "crypto";

/**
 * Deterministic artifact identity:
 * artifact_id = sha256( stable_stringify({manifest, compiled_output}) )
 */

export function sha256Hex(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex");
}

/**
 * Stable stringify to guarantee deterministic hashing.
 * - sorts object keys
 * - preserves arrays order
 */
export function stableStringify(value) {
  if (value === null || value === undefined) return String(value);
  const t = typeof value;
  if (t !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;

  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

export function computeArtifactId(manifest, compiledOutput) {
  const canonical = stableStringify({ manifest, compiledOutput });
  return `schema_artifact_${sha256Hex(canonical)}`;
}

export function createSchemaManifest({
  source_ref,
  compiler_name,
  compiler_version,
  input_hash,
  output_schema_version,
  dependencies = []
}) {
  if (!source_ref) throw new Error("manifest.source_ref is required");
  if (!compiler_name) throw new Error("manifest.compiler_name is required");
  if (!compiler_version) throw new Error("manifest.compiler_version is required");
  if (!output_schema_version) throw new Error("manifest.output_schema_version is required");

  return {
    schema_version: "schema-manifest.v1",
    source_ref,
    compiler_name,
    compiler_version,
    input_hash: String(input_hash || ""),
    output_schema_version,
    dependencies: Array.isArray(dependencies) ? dependencies : []
  };
}

export function createSchemaArtifact({ manifest, compiled_output }) {
  if (!manifest) throw new Error("artifact.manifest is required");
  if (!compiled_output) throw new Error("artifact.compiled_output is required");

  const artifact_id = computeArtifactId(manifest, compiled_output);
  return {
    schema_version: "schema-artifact.v1",
    artifact_id,
    manifest,
    compiled_output,
    created_at: new Date().toISOString()
  };
}


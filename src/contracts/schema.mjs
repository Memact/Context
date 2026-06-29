/**
 * Minimal, dependency-free schema validator used by the CAP v1 contracts.
 *
 * Schemas are plain descriptor objects:
 *   { type, required, properties, items, enum, pattern, format, minItems, minimum, const }
 *
 * validateAgainstSchema returns an array of human-readable error strings; an
 * empty array means the value conforms. This is intentionally small — it covers
 * exactly what the CAP contracts need without pulling in a JSON-Schema engine.
 */

const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/

function typeOf(value) {
  if (value === null) return "null"
  if (Array.isArray(value)) return "array"
  return typeof value
}

function matchesType(value, type) {
  if (type === "integer") return typeof value === "number" && Number.isInteger(value)
  if (type === "array") return Array.isArray(value)
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value)
  if (type === "null") return value === null
  return typeOf(value) === type
}

export function validateAgainstSchema(value, schema, path = "") {
  const errors = []
  const at = path || "(root)"

  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type]
    if (!types.some((type) => matchesType(value, type))) {
      errors.push(`${at}: expected type ${types.join("|")}, got ${typeOf(value)}`)
      return errors // further checks are meaningless on a type mismatch
    }
  }

  if (Object.hasOwn(schema, "const") && value !== schema.const) {
    errors.push(`${at}: expected constant ${JSON.stringify(schema.const)}`)
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${at}: ${JSON.stringify(value)} is not one of ${schema.enum.join(", ")}`)
  }

  if (typeof value === "string") {
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${at}: does not match pattern ${schema.pattern}`)
    }
    if (schema.format === "iso-8601" && (!ISO_8601.test(value) || Number.isNaN(Date.parse(value)))) {
      errors.push(`${at}: is not a valid ISO-8601 timestamp`)
    }
    if (Number.isFinite(schema.minLength) && value.length < schema.minLength) {
      errors.push(`${at}: shorter than minLength ${schema.minLength}`)
    }
  }

  if (typeof value === "number" && Number.isFinite(schema.minimum) && value < schema.minimum) {
    errors.push(`${at}: ${value} is below minimum ${schema.minimum}`)
  }

  if (Array.isArray(value)) {
    if (Number.isFinite(schema.minItems) && value.length < schema.minItems) {
      errors.push(`${at}: needs at least ${schema.minItems} item(s)`)
    }
    if (schema.items) {
      value.forEach((item, index) => {
        errors.push(...validateAgainstSchema(item, schema.items, `${at}[${index}]`))
      })
    }
  }

  if (matchesType(value, "object") && (schema.properties || schema.required)) {
    for (const key of schema.required || []) {
      if (!Object.hasOwn(value, key)) errors.push(`${at}: missing required field "${key}"`)
    }
    for (const [key, sub] of Object.entries(schema.properties || {})) {
      if (Object.hasOwn(value, key)) {
        errors.push(...validateAgainstSchema(value[key], sub, path ? `${path}.${key}` : key))
      }
    }
  }

  return errors
}

export function isValidIso8601(value) {
  return typeof value === "string" && ISO_8601.test(value) && !Number.isNaN(Date.parse(value))
}

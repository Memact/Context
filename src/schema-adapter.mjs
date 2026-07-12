import { CATEGORIES, registry } from "./registry.mjs";

/**
 * Adapter around the existing registry/category data to compile category
 * specifications into a unified metadata structure for compilers and tooling.
 */
export class SchemaAdapter {
  /**
   * List all available categories.
   * @returns {string[]} List of category names.
   */
  static listCategories() {
    return CATEGORIES;
  }

  /**
   * Retrieve and compile the normalized schema for a specific category.
   * @param {string} categoryName - The category identifier.
   * @returns {Promise<Object>} Normalized schema structure.
   */
  static async getSchema(categoryName) {
    if (!CATEGORIES.includes(categoryName)) {
      throw new Error(`Unknown category: ${categoryName}`);
    }

    const modulePath = new URL(`./categories/${categoryName}.mjs`, import.meta.url);
    const categoryModule = await import(modulePath.href);

    // 1. Identify category name
    const category = categoryName;

    // 2. Identify if there's a schema object exported (ending in _SCHEMA)
    const schemaKey = Object.keys(categoryModule).find(key => key.endsWith("_SCHEMA"));
    const schemaObj = schemaKey ? categoryModule[schemaKey] : null;

    // 3. Extracted metadata fields
    const fields = {};
    let description = "";
    let productRule = "";

    const sensitiveFields = new Set();
    const durablePreferences = new Set();

    // Load from SENSITIVE_FIELDS export if available
    if (categoryModule.SENSITIVE_FIELDS instanceof Set) {
      for (const f of categoryModule.SENSITIVE_FIELDS) {
        sensitiveFields.add(f);
      }
    } else if (Array.isArray(categoryModule.SENSITIVE_FIELDS)) {
      for (const f of categoryModule.SENSITIVE_FIELDS) {
        sensitiveFields.add(f);
      }
    }

    // Load from DURABLE_PREFERENCES export if available
    if (categoryModule.DURABLE_PREFERENCES instanceof Set) {
      for (const f of categoryModule.DURABLE_PREFERENCES) {
        durablePreferences.add(f);
      }
    } else if (Array.isArray(categoryModule.DURABLE_PREFERENCES)) {
      for (const f of categoryModule.DURABLE_PREFERENCES) {
        durablePreferences.add(f);
      }
    }

    // Combine with registry sensitive/durable rules (to support fitness/finance/health rules)
    const registrySensitive = registry.getSensitiveFields(categoryName);
    if (registrySensitive instanceof Set) {
      for (const f of registrySensitive) {
        sensitiveFields.add(f);
      }
    }
    const registryDurable = registry.getDurablePreferences(categoryName);
    if (registryDurable instanceof Set) {
      for (const f of registryDurable) {
        durablePreferences.add(f);
      }
    }

    if (schemaObj) {
      description = schemaObj.description || "";
      productRule = schemaObj.product_rule || "";

      if (schemaObj.sections) {
        for (const [sectionName, section] of Object.entries(schemaObj.sections)) {
          if (section.fields) {
            for (const [fieldName, fieldData] of Object.entries(section.fields)) {
              const isSensitive = fieldData.sensitive ?? (sensitiveFields.has(fieldName) || sensitiveFields.has("*"));
              if (isSensitive) {
                sensitiveFields.add(fieldName);
              }
              const isDurableSection = sectionName.includes("preference") || sectionName.includes("stable");
              const isDurable = fieldData.durable ?? (durablePreferences.has(fieldName) || isDurableSection);
              if (isDurable) {
                durablePreferences.add(fieldName);
              }

              fields[fieldName] = {
                name: fieldName,
                description: fieldData.description || "",
                type: fieldData.type || "string",
                sensitive: isSensitive,
                durable: isDurable,
                allowedValues: fieldData.values || null
              };
            }
          }
        }
      }
    } else {
      // Format 1: load from contextFields
      const contextFields = categoryModule.contextFields || {};
      
      // Normalize contextFields if it's an array vs object
      if (Array.isArray(contextFields)) {
        for (const fieldName of contextFields) {
          const isSensitive = sensitiveFields.has(fieldName) || sensitiveFields.has("*");
          const isDurable = durablePreferences.has(fieldName) || durablePreferences.has("*") || (!categoryModule.DURABLE_PREFERENCES);
          if (isDurable) {
            durablePreferences.add(fieldName);
          }
          fields[fieldName] = {
            name: fieldName,
            description: "",
            type: "string",
            sensitive: isSensitive,
            durable: isDurable,
            allowedValues: null
          };
        }
      } else {
        for (const [fieldName, fieldDesc] of Object.entries(contextFields)) {
          const isSensitive = sensitiveFields.has(fieldName) || sensitiveFields.has("*");
          const isDurable = durablePreferences.has(fieldName) || durablePreferences.has("*") || (!categoryModule.DURABLE_PREFERENCES);
          if (isDurable) {
            durablePreferences.add(fieldName);
          }
          fields[fieldName] = {
            name: fieldName,
            description: fieldDesc || "",
            type: "string",
            sensitive: isSensitive,
            durable: isDurable,
            allowedValues: null
          };
        }
      }

      // Add any fields that are in SENSITIVE_FIELDS or DURABLE_PREFERENCES but not in contextFields
      const allKnownFields = new Set([...Object.keys(fields), ...sensitiveFields, ...durablePreferences]);
      for (const fieldName of allKnownFields) {
        if (fieldName === "*") continue;
        if (!fields[fieldName]) {
          const isSensitive = sensitiveFields.has(fieldName) || sensitiveFields.has("*");
          const isDurable = durablePreferences.has(fieldName) || durablePreferences.has("*") || (!categoryModule.DURABLE_PREFERENCES);
          if (isDurable) {
            durablePreferences.add(fieldName);
          }
          fields[fieldName] = {
            name: fieldName,
            description: "",
            type: "string",
            sensitive: isSensitive,
            durable: isDurable,
            allowedValues: null
          };
        }
      }
    }

    // 4. Gather templates (wikiEntryTemplates or proposalOutputExamples or proposalTemplates)
    const wikiTemplates = categoryModule.wikiEntryTemplates || 
                          categoryModule.proposalOutputExamples || 
                          categoryModule.proposalTemplates || [];

    // 5. Permission suggestions
    const permissionSuggestions = categoryModule.permissionSuggestions || {};

    // 6. Care notes
    const careNotes = categoryModule.careNotes || [];

    // 7. Examples
    const examples = categoryModule.rawInputExamples || 
                     categoryModule.normalizedOutputExamples || 
                     categoryModule.FITNESS_EXAMPLES || 
                     categoryModule.MOVIE_BOOKING_EXAMPLES || 
                     null;

    return {
      category,
      description,
      productRule,
      fields,
      sensitiveFields: Array.from(sensitiveFields),
      durablePreferences: Array.from(durablePreferences),
      wikiTemplates,
      permissionSuggestions,
      careNotes,
      examples
    };
  }

  /**
   * Retrieve and compile all category schemas in parallel.
   * @returns {Promise<Object>} Map of category identifier to normalized schema structure.
   */
  static async getSchemas() {
    const schemas = {};
    const promises = CATEGORIES.map(async (category) => {
      schemas[category] = await SchemaAdapter.getSchema(category);
    });
    await Promise.all(promises);
    return schemas;
  }
}

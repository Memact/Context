export const category = "smart_home";

export const SMART_HOME_SCHEMA = {
  category: "smart_home",
  description: "User-owned smart home preferences covering climate, lighting, and automation triggers.",
  product_rule: "Smart home preferences help automate environment settings safely. Exact home locations or security statuses should never be inferred automatically.",
  sections: {
    climate_preferences: {
      description: "Preferred temperature ranges for comfort.",
      fields: {
        thermostat_target_range: {
          type: "Object",
          description: "{ min: number, max: number, scale: 'C' | 'F' }",
          sensitive: false
        }
      }
    },
    lighting_preferences: {
      description: "Preferred smart bulb color temperatures and brightness.",
      fields: {
        bulb_color_temperature: {
          type: "enum",
          values: ["warm", "neutral", "cool", "daylight"],
          sensitive: false
        },
        default_brightness: {
          type: "Number",
          description: "0 to 100 percentage",
          sensitive: false
        }
      }
    },
    automation_rules: {
      description: "Default triggers for home automation events.",
      fields: {
        event_triggers: {
          type: "Array<String>",
          sensitive: false
        }
      }
    }
  }
};

export const SMART_HOME_PERMISSIONS = [
  {
    scope: "smart_home:climate",
    description: "Read and write thermostat temperature ranges.",
    sensitivity: "low",
    default_granted: true
  },
  {
    scope: "smart_home:lighting",
    description: "Read and write smart bulb color and brightness preferences.",
    sensitivity: "low",
    default_granted: true
  },
  {
    scope: "smart_home:automation",
    description: "Read and write default home automation triggers.",
    sensitivity: "medium",
    default_granted: false,
    first_write_requires_confirmation: true
  },
  {
    scope: "smart_home:security",
    description: "Read security logs (cameras, locks). Highly sensitive.",
    sensitivity: "high",
    default_granted: false,
    requires_explicit_wiki_approval: true
  }
];

export const wikiEntryTemplates = [
  "You prefer your home temperature to be between [min_temp] and [max_temp] [scale].",
  "You tend to prefer [color_temp] lighting at around [brightness]% brightness.",
  "Your typical home automation triggers include: [triggers]."
];

export const rawInputExamples = [
  {
    user_id: "u_home_1",
    target_temp_min: 20,
    target_temp_max: 24,
    temp_scale: "C",
    bulb_setting: "warm",
    brightness_level: 80,
    frequent_triggers: ["sunset", "when leaving home"],
    security_camera_active: true // Should be dropped
  },
  {
    user_id: "u_home_2",
    thermostat: { min: 68, max: 72, scale: "F" },
    lighting: "cool",
    door_lock_status: "unlocked" // Should be dropped
  }
];

export const normalizedOutputExamples = [
  {
    category: "smart_home",
    climate_preferences: {
      thermostat_target_range: { min: 20, max: 24, scale: "C" }
    },
    lighting_preferences: {
      bulb_color_temperature: "warm",
      default_brightness: 80
    },
    automation_rules: {
      event_triggers: ["sunset", "when leaving home"]
    },
    dropped_fields: ["security_camera_active"],
    drop_reason: "Security and location states are highly sensitive and dropped from automated context inference."
  }
];

const SENSITIVE_DROP_FIELDS = new Set(["security_camera_active", "door_lock_status", "exact_location", "alarm_state"]);
const VALID_COLOR_TEMPS = new Set(["warm", "neutral", "cool", "daylight"]);

export function normalizeSmartHomeContext(rawInput = {}) {
  const raw = typeof rawInput === "object" && rawInput !== null ? rawInput : {};
  const climate_preferences = {};
  const lighting_preferences = {};
  const automation_rules = {};
  const dropped_fields = [];
  const validation_issues = [];

  // Climate
  if (raw.target_temp_min && raw.target_temp_max && raw.temp_scale) {
    climate_preferences.thermostat_target_range = {
      min: Number(raw.target_temp_min),
      max: Number(raw.target_temp_max),
      scale: String(raw.temp_scale).toUpperCase()
    };
  } else if (raw.thermostat && raw.thermostat.min && raw.thermostat.max) {
    climate_preferences.thermostat_target_range = {
      min: Number(raw.thermostat.min),
      max: Number(raw.thermostat.max),
      scale: String(raw.thermostat.scale || "C").toUpperCase()
    };
  }

  // Lighting
  const bulbColor = raw.bulb_setting || raw.lighting;
  if (bulbColor && VALID_COLOR_TEMPS.has(bulbColor.toLowerCase())) {
    lighting_preferences.bulb_color_temperature = bulbColor.toLowerCase();
  }
  if (raw.brightness_level && !isNaN(raw.brightness_level)) {
    lighting_preferences.default_brightness = Number(raw.brightness_level);
  }

  // Automation
  if (Array.isArray(raw.frequent_triggers)) {
    automation_rules.event_triggers = raw.frequent_triggers.map(String);
  }

  // Safety Drop
  for (const field of SENSITIVE_DROP_FIELDS) {
    if (Object.hasOwn(raw, field)) {
      dropped_fields.push(field);
      validation_issues.push({ field, reason: "unsafe_security_inference" });
    }
  }

  return {
    category: "smart_home",
    climate_preferences,
    lighting_preferences,
    automation_rules,
    dropped_fields,
    drop_reason: dropped_fields.length ? "Security and location states are highly sensitive and dropped from automated context inference." : null,
    validation: validation_issues.length
      ? { ok: false, reason: "unsafe_security_inference", issues: validation_issues }
      : { ok: true }
  };
}

export function validateSmartHomeContext(input = {}) {
  return normalizeSmartHomeContext(input).validation;
}

export function generateWikiEntries(normalizedContext = {}) {
  const proposals = [];
  const climate = normalizedContext.climate_preferences?.thermostat_target_range;
  const lighting = normalizedContext.lighting_preferences;
  const automation = normalizedContext.automation_rules?.event_triggers;

  if (climate) {
    proposals.push({
      id: "wiki_smarthome_climate",
      type: "preference",
      sub_type: "climate",
      proposed_text: `You prefer your home temperature to be between ${climate.min} and ${climate.max} °${climate.scale}.`,
      confidence: 0.85,
      requires_user_confirmation: false
    });
  }

  if (lighting && lighting.bulb_color_temperature) {
    const brightnessText = lighting.default_brightness ? ` at around ${lighting.default_brightness}% brightness` : "";
    proposals.push({
      id: "wiki_smarthome_lighting",
      type: "preference",
      sub_type: "lighting",
      proposed_text: `You tend to prefer ${lighting.bulb_color_temperature} lighting${brightnessText}.`,
      confidence: 0.8,
      requires_user_confirmation: false
    });
  }

  if (automation && automation.length > 0) {
    proposals.push({
      id: "wiki_smarthome_automation",
      type: "preference",
      sub_type: "automation",
      proposed_text: `Your typical home automation triggers include: ${automation.join(", ")}.`,
      confidence: 0.75,
      requires_user_confirmation: true
    });
  }

  return proposals;
}
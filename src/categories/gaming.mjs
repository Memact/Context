export const category = "gaming";

export const GAMING_SCHEMA = {
  category: "gaming",
  description: "User-owned gaming preferences covering genres, controller setup, and play cadence.",
  product_rule: "Activity is not identity. A single test play of a game does not create a durable interest. Preferences should be based on repeated activity, extended session duration, or explicit user settings.",
  sections: {
    preferences: {
      description: "Preferred game genres.",
      fields: {
        preferred_genres: {
          type: "Array<String>",
          sensitive: false
        }
      }
    },
    setup: {
      description: "Hardware preferences for gaming.",
      fields: {
        controller_setup: {
          type: "enum",
          values: ["keyboard_mouse", "gamepad", "touch", "mixed"],
          sensitive: false
        }
      }
    },
    cadence: {
      description: "Player's approach to gaming.",
      fields: {
        play_cadence: {
          type: "enum",
          values: ["casual", "competitive", "mixed"],
          sensitive: false
        }
      }
    }
  }
};

export const GAMING_PERMISSIONS = [
  {
    scope: "gaming:preferences",
    description: "Read and write preferred game genres and play cadence.",
    sensitivity: "low",
    default_granted: true
  },
  {
    scope: "gaming:setup",
    description: "Read and write controller and hardware setup preferences.",
    sensitivity: "low",
    default_granted: true
  }
];

export const wikiEntryTemplates = [
  "You enjoy playing [genres] games.",
  "You prefer playing with a [controller] setup.",
  "You tend to have a [cadence] approach to gaming."
];

export const rawInputExamples = [
  {
    user_id: "gamer_1",
    explicit_genres: ["RPG", "Strategy"],
    primary_input: "keyboard_mouse",
    play_style: "casual"
  },
  {
    user_id: "gamer_2",
    recent_play: "Action",
    session_duration_mins: 15 // Too short to be a durable interest
  }
];

export const normalizedOutputExamples = [
  {
    category: "gaming",
    preferences: {
      preferred_genres: ["RPG", "Strategy"]
    },
    setup: {
      controller_setup: "keyboard_mouse"
    },
    cadence: {
      play_cadence: "casual"
    },
    dropped_fields: [],
    pending_approval_queue: [],
    validation: { ok: true }
  }
];

export function normalizeGamingContext(rawInput = {}) {
  const raw = typeof rawInput === "object" && rawInput !== null ? rawInput : {};
  const preferences = {};
  const setup = {};
  const cadence = {};
  const pending_approval_queue = [];
  const dropped_fields = [];
  const validation_issues = [];

  // Genres
  if (Array.isArray(raw.explicit_genres) && raw.explicit_genres.length > 0) {
    preferences.preferred_genres = raw.explicit_genres.map(String);
  } else if (raw.recent_play) {
    // CRITICAL FIX: "Activity is not identity"
    // Only accept as a durable preference if they played for more than 2 hours (120 mins)
    const sessionMins = Number(raw.session_duration_mins || 0);
    if (sessionMins >= 120) {
        preferences.preferred_genres = [String(raw.recent_play)];
    } else {
        dropped_fields.push("recent_play");
        pending_approval_queue.push({
            field: "recent_play",
            value: String(raw.recent_play),
            reason: "Single short play session does not constitute a durable interest."
        });
    }
  }

  // Setup
  const validSetups = new Set(["keyboard_mouse", "gamepad", "touch", "mixed"]);
  if (raw.primary_input && validSetups.has(raw.primary_input.toLowerCase())) {
    setup.controller_setup = raw.primary_input.toLowerCase();
  }

  // Cadence
  const validCadences = new Set(["casual", "competitive", "mixed"]);
  if (raw.play_style && validCadences.has(raw.play_style.toLowerCase())) {
    cadence.play_cadence = raw.play_style.toLowerCase();
  }

  const drop_reason = dropped_fields.length ? "Activity is not identity. Single short test plays are dropped or held for explicit approval." : null;

  return {
    category: "gaming",
    preferences,
    setup,
    cadence,
    pending_approval_queue,
    dropped_fields,
    drop_reason,
    validation: validation_issues.length
      ? { ok: false, reason: "invalid_gaming_data", issues: validation_issues }
      : { ok: true }
  };
}

export function validateGamingContext(input = {}) {
  return normalizeGamingContext(input).validation;
}

export function generateWikiEntries(normalizedContext = {}) {
  const proposals = [];
  const genres = normalizedContext.preferences?.preferred_genres;
  const setup = normalizedContext.setup?.controller_setup;
  const cadence = normalizedContext.cadence?.play_cadence;

  if (genres && genres.length > 0) {
    proposals.push({
      id: "wiki_gaming_genres",
      type: "preference",
      sub_type: "genres",
      proposed_text: `You enjoy playing ${genres.join(", ")} games.`,
      confidence: 0.8,
      requires_user_confirmation: false
    });
  }

  if (setup) {
    const setupFormatted = setup === "keyboard_mouse" ? "keyboard and mouse" : setup;
    proposals.push({
      id: "wiki_gaming_setup",
      type: "preference",
      sub_type: "setup",
      proposed_text: `You prefer playing with a ${setupFormatted} setup.`,
      confidence: 0.85,
      requires_user_confirmation: false
    });
  }

  if (cadence) {
    proposals.push({
      id: "wiki_gaming_cadence",
      type: "preference",
      sub_type: "cadence",
      proposed_text: `You tend to have a ${cadence} approach to gaming.`,
      confidence: 0.75,
      requires_user_confirmation: false
    });
  }

  return proposals;
}
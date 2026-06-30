export const category = "sports"

const STABLE_FAVORITE_SPORTS = new Set([
  "football",
  "soccer",
  "basketball",
  "cricket",
  "tennis",
  "badminton",
  "baseball",
  "volleyball",
  "hockey",
  "golf",
  "rugby",
  "table tennis"
])

const PLAYING_CADENCE = new Set([
  "daily",
  "weekly",
  "monthly",
  "occasionally",
  "rarely"
])

export const SPORTS_SCHEMA = {
  category: "sports",
  description:
    "User-owned sports preferences, followed teams/leagues, and playing habits inferred from app activity or explicit settings.",

  product_rule:
    "Sports context should capture long-term preferences without assuming permanent identity from one-off events.",

  sections: {
    stable_preferences: {
      description:
        "Long-lived sports preferences explicitly chosen or repeatedly reinforced by the user.",

      fields: {
        favorite_sports: {
          type: "Array<String>",
          examples: [
            "football",
            "basketball",
            "cricket",
            "badminton"
          ],
          sensitive: false
        },

        favorite_teams: {
          type: "Array<String>",
          sensitive: false
        },

        favorite_leagues: {
          type: "Array<String>",
          sensitive: false
        },

        playing_cadence: {
          type: "enum",
          values: [
            "daily",
            "weekly",
            "monthly",
            "occasionally",
            "rarely"
          ],
          sensitive: false
        }
      }
    },

    current_activity: {
      description:
        "Temporary sports activity that should not automatically become permanent memory.",

      fields: {
        recently_played: {
          type: "Array<String>",
          sensitive: false
        },

        recently_followed_events: {
          type: "Array<String>",
          sensitive: false
        }
      }
    },

    sensitive_signals: {
      description:
        "Temporary signals that must never become permanent identity traits.",

      fields: {
        injuries: {
          type: "Array<String>",
          sensitive: true,
          scope: "temporary",
          requires_explicit_confirmation: true
        }
      }
    }
  }
}

export const SPORTS_PERMISSIONS = [
  {
    scope: "sports:preferences",
    description:
      "Read and write favourite sports, teams, leagues and playing cadence.",

    sensitivity: "low",
    default_granted: true
  },

  {
    scope: "sports:activity",
    description:
      "Read and write temporary sports activity.",

    sensitivity: "medium",
    default_granted: false,
    first_write_requires_confirmation: true
  },

  {
    scope: "sports:signals",
    description:
      "Read and write temporary injury information.",

    sensitivity: "high",
    default_granted: false,
    requires_explicit_wiki_approval: true
  }
]

export const wikiEntryTemplates = [
  "You enjoy playing **[favorite_sport]** and usually play [playing_cadence].",

  "You regularly follow **[favorite_team]** and keep up with **[favorite_league]**.",

  "You've recently played **[sport]** several times. Would you like to remember it as one of your favourite sports?"
]

export const rawInputExamples = [
  {
    user_id: "u_123",

    favourite_sport: "Football",

    favourite_team: "Manchester United",

    favourite_league: "Premier League",

    matches_played_this_month: 8,

    last_played: "Football"
  },

  {
    user_id: "u_456",

    followed_team: "Golden State Warriors",

    league: "NBA",

    plays: [
      "Basketball",
      "Basketball",
      "Basketball"
    ],

    cadence: "Weekly"
  }
]

export const normalizedOutputExamples = [
  {
    category: "sports",

    stable_preferences: {
      favorite_sports: [
        "football"
      ],

      favorite_teams: [
        "manchester united"
      ],

      favorite_leagues: [
        "premier league"
      ],

      playing_cadence: "weekly"
    },

    current_activity: {
      recently_played: [
        "football"
      ]
    }
  },

  {
    category: "sports",

    stable_preferences: {
      favorite_sports: [
        "basketball"
      ],

      favorite_teams: [
        "golden state warriors"
      ],

      favorite_leagues: [
        "nba"
      ],

      playing_cadence: "weekly"
    }
  }
]

const OVERCONFIDENT_FIELDS = new Set([
  "fan_score",
  "engagement_score",
  "predicted_favorite_team"
])

export function normalizeSportsContext(rawInput = {}) {
  const raw = isObject(rawInput) ? rawInput : {}

  const stable_preferences = {}
  const current_activity = {}
  const pending_approval = []
  const dropped_fields = []
  const validation_issues = []

  // ---------- Favorite Sports ----------
  const favoriteSports = normalizeFavoriteSports(raw)
  if (favoriteSports.length) {
    stable_preferences.favorite_sports = favoriteSports
  }

  // ---------- Favorite Teams ----------
  const favoriteTeams = normalizeFavoriteTeams(raw)
  if (favoriteTeams.length) {
    stable_preferences.favorite_teams = favoriteTeams
  }

  // ---------- Favorite Leagues ----------
  const favoriteLeagues = normalizeFavoriteLeagues(raw)
  if (favoriteLeagues.length) {
    stable_preferences.favorite_leagues = favoriteLeagues
  }

  // ---------- Playing Cadence ----------
  const cadence = normalizePlayingCadence(raw)
  if (cadence) {
    stable_preferences.playing_cadence = cadence
  }

  // ---------- Recent Activity ----------
  const recentlyPlayed = normalizeRecentlyPlayed(raw)
  if (recentlyPlayed.length) {
    current_activity.recently_played = recentlyPlayed
  }

  const recentEvents = normalizeRecentEvents(raw)
  if (recentEvents.length) {
    current_activity.recently_followed_events = recentEvents
  }

  // ---------- Overconfident AI Fields ----------
  for (const field of OVERCONFIDENT_FIELDS) {
    if (Object.hasOwn(raw, field)) {
      dropped_fields.push(field)

      validation_issues.push({
        field,
        reason: "overconfident_inference"
      })
    }
  }

  // ---------- Sensitive Fields ----------
  const injuries = normalizeStringArray(raw.injuries)

  if (injuries.length) {
    pending_approval.push({
      field: "injuries",
      value: injuries,
      sensitive: true,
      scope: "temporary",
      source: "app_signal",
      requires_explicit_confirmation: true
    })
  }

  const drop_reason = buildDropReason(
    dropped_fields,
    validation_issues,
    pending_approval
  )

  return {
    category: "sports",

    stable_preferences,

    current_activity,

    pending_approval_queue: pending_approval,

    dropped_fields: unique(dropped_fields),

    drop_reason,

    validation: validation_issues.length
      ? {
          ok: false,
          reason: "overconfident_inference",
          issues: validation_issues
        }
      : {
          ok: true
        }
  }
}

export function validateSportsContext(input = {}) {
  const normalized = normalizeSportsContext(input)
  return normalized.validation
}

export function generateWikiEntries(normalizedContext = {}) {
  const proposals = []

  const stablePreferences = normalizedContext.stable_preferences || {}
  const currentActivity = normalizedContext.current_activity || {}
  const pendingApprovalQueue = Array.isArray(
    normalizedContext.pending_approval_queue
  )
    ? normalizedContext.pending_approval_queue
    : []

  if (Object.keys(stablePreferences).length) {
    proposals.push({
      id: "wiki_sports_preferences",
      type: "preference",
      sub_type: "sports",
      proposed_text: buildPreferenceText(stablePreferences),
      raw_source_summary:
        "Derived from repeated sports interactions and explicit user preferences.",
      confidence: 0.86,
      requires_user_confirmation: false,
      actions: ["approve", "edit", "reject", "delete"]
    })
  }

  if (currentActivity.recently_played?.length) {
    proposals.push({
      id: "wiki_recent_sports_activity",
      type: "activity",
      sub_type: "recent_playing",
      proposed_text: buildActivityText(currentActivity),
      raw_source_summary:
        "Summarized from recent sports activity.",
      confidence: 0.72,
      requires_user_confirmation: false,
      actions: ["approve", "edit", "reject", "delete"]
    })
  }

  pendingApprovalQueue.forEach((item, index) => {
    proposals.push({
      id: `wiki_sports_signal_${item.field}_${index}`,
      type: "signal",
      sub_type: item.field,
      proposed_text: buildSignalText(item),
      raw_source_summary:
        "Sensitive sports signal waiting for user approval.",
      confidence: 0.40,
      requires_user_confirmation: true,
      actions: ["approve", "edit", "reject", "delete"]
    })
  })

  return proposals
}

function normalizeFavoriteSports(raw) {
  const sports = []

  normalizeStringArray(raw.favorite_sports).forEach((sport) => {
    sports.push(normalizeName(sport))
  })

  if (typeof raw.favourite_sport === "string") {
    sports.push(normalizeName(raw.favourite_sport))
  }

  return unique(sports.filter(Boolean))
}

function normalizeFavoriteTeams(raw) {
  const teams = []

  normalizeStringArray(raw.favorite_teams).forEach((team) => {
    teams.push(normalizeName(team))
  })

  if (typeof raw.favourite_team === "string") {
    teams.push(normalizeName(raw.favourite_team))
  }

  if (typeof raw.followed_team === "string") {
    teams.push(normalizeName(raw.followed_team))
  }

  return unique(teams.filter(Boolean))
}

function normalizeFavoriteLeagues(raw) {
  const leagues = []

  normalizeStringArray(raw.favorite_leagues).forEach((league) => {
    leagues.push(normalizeName(league))
  })

  if (typeof raw.favourite_league === "string") {
    leagues.push(normalizeName(raw.favourite_league))
  }

  if (typeof raw.league === "string") {
    leagues.push(normalizeName(raw.league))
  }

  return unique(leagues.filter(Boolean))
}

function normalizePlayingCadence(raw) {
  const value =
    raw.playing_cadence ??
    raw.cadence

  if (!value) return null

  const normalized = String(value).trim().toLowerCase()

  return PLAYING_CADENCE.has(normalized)
    ? normalized
    : null
}

function normalizeRecentlyPlayed(raw) {
  const sports = []

  normalizeStringArray(raw.recently_played).forEach((sport) => {
    sports.push(normalizeName(sport))
  })

  if (typeof raw.last_played === "string") {
    sports.push(normalizeName(raw.last_played))
  }

  if (Array.isArray(raw.plays)) {
    raw.plays.forEach((sport) => {
      sports.push(normalizeName(sport))
    })
  }

  return unique(sports.filter(Boolean))
}

function normalizeRecentEvents(raw) {
  return normalizeStringArray(raw.recently_followed_events)
    .map(normalizeName)
}

function buildPreferenceText(pref) {
  const sports = pref.favorite_sports?.join(", ")
  const teams = pref.favorite_teams?.join(", ")
  const leagues = pref.favorite_leagues?.join(", ")
  const cadence = pref.playing_cadence

  let text = ""

  if (sports) text += `You enjoy playing ${sports}. `
  if (teams) text += `You follow ${teams}. `
  if (leagues) text += `You regularly follow ${leagues}. `
  if (cadence) text += `You usually play ${cadence}.`

  return text.trim()
}

function buildActivityText(activity) {
  return `You've recently played ${activity.recently_played.join(", ")}.`
}

function buildSignalText(item) {
  return `Sensitive sports information (${item.field}) requires your approval before saving.`
}

function buildDropReason(droppedFields, validationIssues, pendingApproval) {
  if (validationIssues.length) {
    return "Overconfident AI-generated labels were removed."
  }

  if (pendingApproval.length) {
    return "Sensitive information requires explicit user approval."
  }

  if (droppedFields.length) {
    return "Temporary signals were removed."
  }

  return null
}

function normalizeStringArray(value) {
  return Array.isArray(value)
    ? value.map(v => String(v).trim()).filter(Boolean)
    : []
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

function unique(values) {
  return [...new Set(values)]
}

function isObject(value) {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
}
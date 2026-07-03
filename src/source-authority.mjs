const DEFAULT_SOURCE_AUTHORITY_RATINGS = Object.freeze({
  music: Object.freeze({
    spotify: 1.15,
    "apple-music": 1.1,
    "youtube-music": 1.05,
    lastfm: 1.05,
  }),
  reading: Object.freeze({
    "reader-app": 1.1,
    pocket: 1.08,
    instapaper: 1.08,
    feedly: 1.05,
  }),
  news: Object.freeze({
    "news-app": 1.08,
    feedly: 1.06,
    reddit: 0.95,
  }),
  fitness: Object.freeze({
    "apple-health": 1.15,
    "google-fit": 1.1,
    strava: 1.12,
    fitbit: 1.08,
  }),
  shopping: Object.freeze({
    amazon: 1.2,
    "amazon-shopping": 1.2,
    ebay: 1.05,
    shopify: 1.08,
  }),
  learning: Object.freeze({
    coursera: 1.08,
    duolingo: 1.1,
    notion: 1.05,
    obsidian: 1.05,
  }),
});

function normalizeCategory(value) {
  return String(value || "general")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "general";
}

function normalizeAppId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractAppIds(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(extractAppIds);
  if (typeof value === "object") {
    const direct = [
      value.app_id,
      value.appId,
      value.source_app_id,
      value.sourceAppId,
      value.source,
      value.source_label,
      value.provider,
      value.app,
    ];
    return direct.flatMap(extractAppIds).filter(Boolean);
  }
  return [String(value).trim()].filter(Boolean);
}

function findAppId(input = {}, options = {}) {
  const candidates = [
    options.app_id,
    options.appId,
    input.app_id,
    input.appId,
    input.source_app_id,
    input.sourceAppId,
    input.app,
    input.source,
    input.source_label,
    input.provider,
    input.raw_signal?.app_id,
    input.raw_signal?.appId,
    input.raw_signal?.source_app_id,
    input.raw_signal?.sourceAppId,
    input.raw_signal?.source,
    input.raw_signal?.source_label,
    input.raw_signal?.provider,
    input.raw_signal?.app,
  ];

  for (const candidate of candidates) {
    const appId = normalizeAppId(candidate);
    if (appId) return appId;
  }

  const trail = Array.isArray(input.source_trail) ? input.source_trail : [];
  for (const entry of trail) {
    const direct = extractAppIds(entry).map(normalizeAppId).find(Boolean);
    if (direct) return direct;
  }

  return null;
}

function round(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 10000) / 10000;
}

export function resolveSourceAuthority(input = {}, options = {}) {
  const category = normalizeCategory(options.category || input.category || input.raw_signal?.category || "general");
  const appId = findAppId(input, options);
  const categoryTable = DEFAULT_SOURCE_AUTHORITY_RATINGS[category] || null;
  const multiplier = categoryTable && appId
    ? (categoryTable[appId] ?? 1.0)
    : 1.0;

  return {
    app_id: appId,
    category,
    multiplier: round(multiplier),
  };
}

export function calibrateConfidence(confidence, input = {}, options = {}) {
  const baseConfidence = Number(confidence ?? 0);
  const authority = resolveSourceAuthority(input, options);

  if (!Number.isFinite(baseConfidence)) {
    return { confidence: 0, source_authority: authority };
  }

  return {
    confidence: round(baseConfidence * authority.multiplier),
    source_authority: authority,
  };
}

export { DEFAULT_SOURCE_AUTHORITY_RATINGS };

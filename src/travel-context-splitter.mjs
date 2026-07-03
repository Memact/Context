/**
 * Memact Engine — Commute vs. Business Travel Location Context Splitter (#195)
 *
 * Implements a geo-fenced travel classifier that routes location signals:
 *   - INSIDE the user's home metropolitan region  → "commute" context
 *   - OUTSIDE the user's home metropolitan region → "business_travel" context
 *
 * Core principles (Activity is not identity):
 *   - Exact GPS coordinates are never stored or returned in output
 *   - Classification is based on coarse region matching only
 *   - All signals require user review before memory adoption
 *
 * Architecture:
 *   1. haversineDistance()      — great-circle distance between two lat/lng points (km)
 *   2. isWithinHomeRegion()     — checks if a location falls within the home metro radius
 *   3. classifyTravelSignal()   — main entry: routes a location signal to commute or business_travel
 *   4. buildTravelContextRecord() — shapes the classification into a reviewable Memact memory record
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default home metropolitan radius in km. Covers most city metro areas. */
export const DEFAULT_HOME_RADIUS_KM = 80;

/** Travel context category values */
export const TRAVEL_CONTEXT = Object.freeze({
  COMMUTE:         "commute",
  BUSINESS_TRAVEL: "business_travel",
  UNKNOWN:         "unknown"
});

/** Trip signal types accepted by the classifier */
export const TRIP_SIGNAL_TYPES = Object.freeze({
  RIDE:       "ride",        // Uber, Lyft, cab booking
  NAVIGATION: "navigation",  // Maps turn-by-turn
  CHECKIN:    "checkin",     // Hotel / airport check-in
  SEARCH:     "search"       // Location search query
});

/** Radius of the Earth in km (WGS-84 mean) */
const EARTH_RADIUS_KM = 6371.0088;

// ---------------------------------------------------------------------------
// Geo utilities — no external dependencies
// ---------------------------------------------------------------------------

/**
 * Haversine great-circle distance between two coordinate pairs.
 * Returns distance in kilometres.
 *
 * @param {{ lat: number, lng: number }} pointA
 * @param {{ lat: number, lng: number }} pointB
 * @returns {number}
 */
export function haversineDistance(pointA, pointB) {
  if (!pointA || !pointB) return Infinity;

  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(pointB.lat - pointA.lat);
  const dLng = toRad(pointB.lng - pointA.lng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(pointA.lat)) *
      Math.cos(toRad(pointB.lat)) *
      Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/**
 * Determine whether a location coordinate falls within the user's
 * home metropolitan region.
 *
 * @param {{ lat: number, lng: number }} location  — Signal location (coarse)
 * @param {{ lat: number, lng: number }} homeAnchor — User's home metro centroid
 * @param {number} [radiusKm]                      — Metro radius (default: 80 km)
 * @returns {boolean}
 */
export function isWithinHomeRegion(location, homeAnchor, radiusKm = DEFAULT_HOME_RADIUS_KM) {
  if (!location || !homeAnchor) return false;

  const lat = Number(location.lat);
  const lng = Number(location.lng);
  const aLat = Number(homeAnchor.lat);
  const aLng = Number(homeAnchor.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
      !Number.isFinite(aLat) || !Number.isFinite(aLng)) {
    return false;
  }

  const radius = Number.isFinite(Number(radiusKm)) && Number(radiusKm) > 0
    ? Number(radiusKm)
    : DEFAULT_HOME_RADIUS_KM;

  return haversineDistance({ lat, lng }, { lat: aLat, lng: aLng }) <= radius;
}

// ---------------------------------------------------------------------------
// Classifier
// ---------------------------------------------------------------------------

/**
 * Classify a single location signal as commute or business_travel based on
 * geo-fence membership.
 *
 * Signal location is treated as a coarse centroid (city/neighbourhood level),
 * never a precise GPS fix. The raw coordinates are not forwarded to the output.
 *
 * @param {object} signal
 *   @property {{ lat: number, lng: number }} location    — Coarse signal location
 *   @property {string}  [signal_type]                   — One of TRIP_SIGNAL_TYPES
 *   @property {string}  [source]                        — App source (e.g. "uber", "google-maps")
 *   @property {string}  [destination_label]             — Human-readable destination name
 *   @property {string}  [occurred_at]                   — ISO-8601 timestamp
 *   @property {number}  [duration_minutes]              — Trip or session duration
 *
 * @param {object} homeRegion
 *   @property {{ lat: number, lng: number }} anchor     — Home metro centroid
 *   @property {number}  [radius_km]                     — Override metro radius
 *   @property {string}  [region_label]                  — Human-readable home region name
 *
 * @param {object} [options]
 *   @property {boolean} [strict]   — If true, treat anchor validation errors as UNKNOWN
 *
 * @returns {{ context: string, is_home_region: boolean, distance_km: number|null, reason: string }}
 */
export function classifyTravelSignal(signal = {}, homeRegion = {}, options = {}) {
  const location   = signal.location  || null;
  const anchor     = homeRegion.anchor || null;
  const radiusKm   = homeRegion.radius_km ?? DEFAULT_HOME_RADIUS_KM;

  // Guard: cannot classify without a home anchor
  if (!anchor || !Number.isFinite(Number(anchor.lat)) || !Number.isFinite(Number(anchor.lng))) {
    return {
      context: TRAVEL_CONTEXT.UNKNOWN,
      is_home_region: false,
      distance_km: null,
      reason: "home_anchor_missing_or_invalid"
    };
  }

  // Guard: cannot classify without a signal location
  if (!location || !Number.isFinite(Number(location.lat)) || !Number.isFinite(Number(location.lng))) {
    return {
      context: TRAVEL_CONTEXT.UNKNOWN,
      is_home_region: false,
      distance_km: null,
      reason: "signal_location_missing_or_invalid"
    };
  }

  const distanceKm = haversineDistance(
    { lat: Number(location.lat), lng: Number(location.lng) },
    { lat: Number(anchor.lat),   lng: Number(anchor.lng)   }
  );
  const inHomeRegion = distanceKm <= radiusKm;

  return {
    context:        inHomeRegion ? TRAVEL_CONTEXT.COMMUTE : TRAVEL_CONTEXT.BUSINESS_TRAVEL,
    is_home_region: inHomeRegion,
    distance_km:    Number(distanceKm.toFixed(2)),
    reason:         inHomeRegion
      ? `within_home_region (${Number(distanceKm.toFixed(1))} km <= ${radiusKm} km)`
      : `outside_home_region (${Number(distanceKm.toFixed(1))} km > ${radiusKm} km)`
  };
}

// ---------------------------------------------------------------------------
// Context record builder
// ---------------------------------------------------------------------------

/**
 * Build a Memact-compatible, user-reviewable context record from a travel
 * signal classification. Exact coordinates are stripped from the output —
 * only the coarse classification and non-identifying metadata are retained.
 *
 * @param {object} signal       — Original location signal (same shape as classifyTravelSignal)
 * @param {object} homeRegion   — Home region definition (same shape as classifyTravelSignal)
 * @param {object} [options]
 *   @property {boolean} [requireReview]  — Override the default requires_approval flag
 *
 * @returns {object}  A context record ready for shapeContextProposal / review pipeline
 */
export function buildTravelContextRecord(signal = {}, homeRegion = {}, options = {}) {
  const classification = classifyTravelSignal(signal, homeRegion, options);

  const signalType      = String(signal.signal_type || TRIP_SIGNAL_TYPES.RIDE).toLowerCase();
  const source          = String(signal.source || "unknown").toLowerCase();
  const destLabel       = String(signal.destination_label || "").trim() || null;
  const occurredAt      = signal.occurred_at || new Date().toISOString();
  const durationMinutes = typeof signal.duration_minutes === "number" ? signal.duration_minutes : null;
  const regionLabel     = String(homeRegion.region_label || "home region").trim();

  const isUnknown       = classification.context === TRAVEL_CONTEXT.UNKNOWN;
  const isBusiness      = classification.context === TRAVEL_CONTEXT.BUSINESS_TRAVEL;

  // Build a safe observation string — no raw coordinates
  const observationParts = [
    signalType === TRIP_SIGNAL_TYPES.RIDE       ? "Ride booking" :
    signalType === TRIP_SIGNAL_TYPES.NAVIGATION ? "Navigation session" :
    signalType === TRIP_SIGNAL_TYPES.CHECKIN    ? "Location check-in" :
    "Location search",
    `via ${source}`,
    destLabel ? `to ${destLabel}` : null,
    durationMinutes ? `(${durationMinutes} min)` : null
  ].filter(Boolean).join(" ");

  const categoryLabel = isBusiness ? "business_travel" : "commute";

  const suggestion = isUnknown
    ? "Location context could not be classified — home region anchor is required."
    : isBusiness
      ? `This trip appears to be outside your ${regionLabel}. Save it as a business travel context?`
      : `This trip is within your ${regionLabel}. Save it as a commute context?`;

  return {
    // Core classification
    category:          categoryLabel,
    field_path:        `travel.${categoryLabel}`,
    context:           classification.context,

    // Source & timing (no coordinates)
    source,
    signal_type:       signalType,
    occurred_at:       occurredAt,

    // Geo classification metadata (coarse only — no raw lat/lng)
    is_home_region:    classification.is_home_region,
    distance_km:       classification.distance_km,
    home_region_label: regionLabel,
    classification_reason: classification.reason,

    // Destination label only if provided
    ...(destLabel ? { destination_label: destLabel } : {}),
    ...(durationMinutes !== null ? { duration_minutes: durationMinutes } : {}),

    // Memory / lifecycle metadata
    observation_type:  "weak_observation",   // One signal = weak; repeated patterns = strong
    confidence:        isUnknown ? "none" : "low",
    visibility:        "private",
    is_identity_claim: false,               // Activity is not identity
    requires_approval: options.requireReview !== false,
    needs_review:      true,

    // User-facing suggestion for the review surface
    suggestion,
    observation: observationParts
  };
}

// ---------------------------------------------------------------------------
// Batch classifier
// ---------------------------------------------------------------------------

/**
 * Classify a batch of location signals and split them into two context buckets:
 * commute signals and business_travel signals. Unknown signals are placed in a
 * separate bucket for human review.
 *
 * @param {object[]} signals     — Array of signal objects
 * @param {object}   homeRegion  — Home region definition
 * @param {object}   [options]   — Forwarded to buildTravelContextRecord
 * @returns {{ commute: object[], business_travel: object[], unknown: object[] }}
 */
export function splitTravelSignals(signals = [], homeRegion = {}, options = {}) {
  const result = {
    commute:         [],
    business_travel: [],
    unknown:         []
  };

  for (const signal of (Array.isArray(signals) ? signals : [])) {
    const record = buildTravelContextRecord(signal, homeRegion, options);
    if (record.context === TRAVEL_CONTEXT.COMMUTE) {
      result.commute.push(record);
    } else if (record.context === TRAVEL_CONTEXT.BUSINESS_TRAVEL) {
      result.business_travel.push(record);
    } else {
      result.unknown.push(record);
    }
  }

  return result;
}

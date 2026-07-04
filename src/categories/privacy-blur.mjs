/**
 * Memact Engine - PII-Safe Aggregation Schema
 * Intercepts and transforms highly sensitive raw data into generalized, privacy-safe claims.
 */

/**
 * Transforms an exact ISO timestamp into a generalized behavioral bucket.
 * @param {string} timeInput - The exact ISO timestamp (e.g., "2026-07-02T06:15:00Z")
 * @returns {string} The semantic temporal bucket (e.g., "early_morning")
 */
export function blurTemporalData(timeInput) {
  if (!timeInput) return "unknown_time";
  
  try {
    const date = new Date(timeInput);
    if (isNaN(date.getTime())) return "unknown_time";

    const hour = date.getUTCHours();
    
    if (hour >= 4 && hour < 8) return "early_morning";
    if (hour >= 8 && hour < 12) return "morning";
    if (hour >= 12 && hour < 17) return "afternoon";
    if (hour >= 17 && hour < 21) return "evening";
    if (hour >= 21 || hour < 4) return "night";
    
  } catch (e) {
    return "unknown_time";
  }
}

/**
 * Strips exact GPS coordinates and venue names, retaining only semantic location meaning.
 * @param {Object} locationObj - The raw location object containing sensitive coordinates.
 * @returns {Object} A privacy-safe location object.
 */
export function blurSpatialData(locationObj) {
  if (!locationObj || typeof locationObj !== 'object') {
    return { location_type: "unknown" };
  }

  const safeData = { ...locationObj };
  
  // Strict blacklist of PII and highly-specific spatial keys
  const sensitiveKeys = [
    'lat', 'lng', 'latitude', 'longitude', 
    'coordinates', 'venue', 'venue_name', 
    'address', 'exact_location', 'street'
  ];

  sensitiveKeys.forEach(key => {
    if (key in safeData) {
      delete safeData[key];
    }
  });

  // Fallback to ensure we retain the semantic category if standard keys are missing
  if (!safeData.location_type && safeData.category) {
    safeData.location_type = safeData.category;
    delete safeData.category;
  }

  return safeData;
}
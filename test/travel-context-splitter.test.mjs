import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_HOME_RADIUS_KM,
  TRAVEL_CONTEXT,
  TRIP_SIGNAL_TYPES,
  haversineDistance,
  isWithinHomeRegion,
  classifyTravelSignal,
  buildTravelContextRecord,
  splitTravelSignals
} from "../src/travel-context-splitter.mjs";

// ---------------------------------------------------------------------------
// Test fixtures — real city coordinates (coarse centroids)
// ---------------------------------------------------------------------------

// Mumbai city centre (home anchor for tests)
const MUMBAI_ANCHOR = { lat: 19.0760, lng: 72.8777 };

// Pune centroid — ~148 km from Mumbai, outside 80 km radius
const PUNE_LOCATION = { lat: 18.5204, lng: 73.8567 };

// Bandra (Mumbai suburb) centroid — ~10 km from anchor, inside radius
const BANDRA_LOCATION = { lat: 19.0596, lng: 72.8295 };

// New York centroid — clearly outside Mumbai metro
const NY_LOCATION = { lat: 40.7128, lng: -74.0060 };

// ---------------------------------------------------------------------------
// haversineDistance
// ---------------------------------------------------------------------------

test("haversineDistance returns 0 for identical coordinates", () => {
  const d = haversineDistance(MUMBAI_ANCHOR, MUMBAI_ANCHOR);
  assert.ok(d < 0.01, `Expected ~0, got ${d}`);
});

test("haversineDistance calculates Mumbai→Pune distance correctly (~120 km)", () => {
  const d = haversineDistance(MUMBAI_ANCHOR, PUNE_LOCATION);
  assert.ok(d > 110 && d < 145, `Expected 110-145 km, got ${d}`);
});

test("haversineDistance calculates Mumbai→Bandra distance correctly (<15 km)", () => {
  const d = haversineDistance(MUMBAI_ANCHOR, BANDRA_LOCATION);
  assert.ok(d < 15, `Expected <15 km, got ${d}`);
});

test("haversineDistance returns Infinity for null inputs", () => {
  assert.equal(haversineDistance(null, MUMBAI_ANCHOR), Infinity);
  assert.equal(haversineDistance(MUMBAI_ANCHOR, null), Infinity);
  assert.equal(haversineDistance(null, null), Infinity);
});

test("haversineDistance is symmetric", () => {
  const d1 = haversineDistance(MUMBAI_ANCHOR, PUNE_LOCATION);
  const d2 = haversineDistance(PUNE_LOCATION, MUMBAI_ANCHOR);
  assert.ok(Math.abs(d1 - d2) < 0.001, `Expected symmetric distances, got ${d1} vs ${d2}`);
});

// ---------------------------------------------------------------------------
// isWithinHomeRegion
// ---------------------------------------------------------------------------

test("isWithinHomeRegion returns true for Bandra (inside Mumbai metro)", () => {
  assert.ok(isWithinHomeRegion(BANDRA_LOCATION, MUMBAI_ANCHOR, 80));
});

test("isWithinHomeRegion returns false for Pune (outside Mumbai metro at 80km radius)", () => {
  assert.ok(!isWithinHomeRegion(PUNE_LOCATION, MUMBAI_ANCHOR, 80));
});

test("isWithinHomeRegion returns true for Pune if radius is set large enough", () => {
  assert.ok(isWithinHomeRegion(PUNE_LOCATION, MUMBAI_ANCHOR, 200));
});

test("isWithinHomeRegion returns false for null location", () => {
  assert.ok(!isWithinHomeRegion(null, MUMBAI_ANCHOR));
});

test("isWithinHomeRegion returns false for null anchor", () => {
  assert.ok(!isWithinHomeRegion(BANDRA_LOCATION, null));
});

test("isWithinHomeRegion uses DEFAULT_HOME_RADIUS_KM when no radius provided", () => {
  // Bandra is well within 80 km
  assert.ok(isWithinHomeRegion(BANDRA_LOCATION, MUMBAI_ANCHOR));
  // Pune is outside 80 km
  assert.ok(!isWithinHomeRegion(PUNE_LOCATION, MUMBAI_ANCHOR));
});

test("isWithinHomeRegion returns false for invalid coordinates", () => {
  assert.ok(!isWithinHomeRegion({ lat: NaN, lng: 72 }, MUMBAI_ANCHOR));
  assert.ok(!isWithinHomeRegion(BANDRA_LOCATION, { lat: "bad", lng: 72 }));
});

// ---------------------------------------------------------------------------
// classifyTravelSignal
// ---------------------------------------------------------------------------

test("classifyTravelSignal classifies Bandra ride as commute", () => {
  const result = classifyTravelSignal(
    { location: BANDRA_LOCATION, signal_type: "ride", source: "uber" },
    { anchor: MUMBAI_ANCHOR, radius_km: 80 }
  );
  assert.equal(result.context, TRAVEL_CONTEXT.COMMUTE);
  assert.ok(result.is_home_region === true);
  assert.ok(result.distance_km < 15);
});

test("classifyTravelSignal classifies Pune ride as business_travel", () => {
  const result = classifyTravelSignal(
    { location: PUNE_LOCATION, signal_type: "ride", source: "uber" },
    { anchor: MUMBAI_ANCHOR, radius_km: 80 }
  );
  assert.equal(result.context, TRAVEL_CONTEXT.BUSINESS_TRAVEL);
  assert.ok(result.is_home_region === false);
  assert.ok(result.distance_km > 80);
});

test("classifyTravelSignal classifies New York navigation as business_travel", () => {
  const result = classifyTravelSignal(
    { location: NY_LOCATION, signal_type: "navigation", source: "google-maps" },
    { anchor: MUMBAI_ANCHOR, radius_km: 80 }
  );
  assert.equal(result.context, TRAVEL_CONTEXT.BUSINESS_TRAVEL);
  assert.ok(result.distance_km > 10000);
});

test("classifyTravelSignal returns unknown when home anchor is missing", () => {
  const result = classifyTravelSignal(
    { location: BANDRA_LOCATION },
    {}
  );
  assert.equal(result.context, TRAVEL_CONTEXT.UNKNOWN);
  assert.equal(result.distance_km, null);
  assert.equal(result.reason, "home_anchor_missing_or_invalid");
});

test("classifyTravelSignal returns unknown when signal location is missing", () => {
  const result = classifyTravelSignal(
    {},
    { anchor: MUMBAI_ANCHOR }
  );
  assert.equal(result.context, TRAVEL_CONTEXT.UNKNOWN);
  assert.equal(result.reason, "signal_location_missing_or_invalid");
});

test("classifyTravelSignal returns unknown for invalid coordinates", () => {
  const result = classifyTravelSignal(
    { location: { lat: NaN, lng: 72 } },
    { anchor: MUMBAI_ANCHOR }
  );
  assert.equal(result.context, TRAVEL_CONTEXT.UNKNOWN);
});

test("classifyTravelSignal respects custom radius_km from homeRegion", () => {
  // At 200 km radius, Pune should be inside
  const result = classifyTravelSignal(
    { location: PUNE_LOCATION },
    { anchor: MUMBAI_ANCHOR, radius_km: 200 }
  );
  assert.equal(result.context, TRAVEL_CONTEXT.COMMUTE);
});

// ---------------------------------------------------------------------------
// buildTravelContextRecord — privacy & structure
// ---------------------------------------------------------------------------

test("buildTravelContextRecord strips raw coordinates from output", () => {
  const record = buildTravelContextRecord(
    { location: BANDRA_LOCATION, signal_type: "ride", source: "uber" },
    { anchor: MUMBAI_ANCHOR }
  );
  // Exact coordinates must NOT appear in the output
  const json = JSON.stringify(record);
  assert.ok(!json.includes("19.0596"), "lat should not appear in output");
  assert.ok(!json.includes("72.8295"), "lng should not appear in output");
});

test("buildTravelContextRecord sets commute category for home-region signals", () => {
  const record = buildTravelContextRecord(
    { location: BANDRA_LOCATION, signal_type: "ride", source: "uber" },
    { anchor: MUMBAI_ANCHOR, radius_km: 80 }
  );
  assert.equal(record.category, "commute");
  assert.equal(record.field_path, "travel.commute");
  assert.equal(record.context, TRAVEL_CONTEXT.COMMUTE);
});

test("buildTravelContextRecord sets business_travel category for out-of-region signals", () => {
  const record = buildTravelContextRecord(
    { location: PUNE_LOCATION, signal_type: "ride", source: "uber", destination_label: "Pune Office" },
    { anchor: MUMBAI_ANCHOR, radius_km: 80, region_label: "Mumbai" }
  );
  assert.equal(record.category, "business_travel");
  assert.equal(record.field_path, "travel.business_travel");
  assert.equal(record.destination_label, "Pune Office");
  assert.ok(record.suggestion.includes("Mumbai"));
  assert.ok(record.suggestion.includes("business travel"));
});

test("buildTravelContextRecord marks record as requiring user review", () => {
  const record = buildTravelContextRecord(
    { location: BANDRA_LOCATION, signal_type: "ride", source: "uber" },
    { anchor: MUMBAI_ANCHOR }
  );
  assert.equal(record.requires_approval, true);
  assert.equal(record.needs_review, true);
  assert.equal(record.is_identity_claim, false);
  assert.equal(record.visibility, "private");
});

test("buildTravelContextRecord requireReview can be disabled via options", () => {
  const record = buildTravelContextRecord(
    { location: BANDRA_LOCATION, signal_type: "ride", source: "uber" },
    { anchor: MUMBAI_ANCHOR },
    { requireReview: false }
  );
  assert.equal(record.requires_approval, false);
});

test("buildTravelContextRecord includes duration_minutes when provided", () => {
  const record = buildTravelContextRecord(
    { location: BANDRA_LOCATION, signal_type: "ride", source: "uber", duration_minutes: 25 },
    { anchor: MUMBAI_ANCHOR }
  );
  assert.equal(record.duration_minutes, 25);
});

test("buildTravelContextRecord generates correct observation for each signal_type", () => {
  const rideRecord = buildTravelContextRecord(
    { location: BANDRA_LOCATION, signal_type: "ride", source: "uber" },
    { anchor: MUMBAI_ANCHOR }
  );
  assert.ok(rideRecord.observation.includes("Ride booking"));

  const navRecord = buildTravelContextRecord(
    { location: BANDRA_LOCATION, signal_type: "navigation", source: "google-maps" },
    { anchor: MUMBAI_ANCHOR }
  );
  assert.ok(navRecord.observation.includes("Navigation session"));

  const checkinRecord = buildTravelContextRecord(
    { location: PUNE_LOCATION, signal_type: "checkin", source: "hotels.com" },
    { anchor: MUMBAI_ANCHOR }
  );
  assert.ok(checkinRecord.observation.includes("Location check-in"));
});

// ---------------------------------------------------------------------------
// splitTravelSignals
// ---------------------------------------------------------------------------

test("splitTravelSignals correctly buckets commute and business_travel signals", () => {
  const signals = [
    { location: BANDRA_LOCATION, signal_type: "ride",       source: "uber",        destination_label: "Office, Bandra" },
    { location: BANDRA_LOCATION, signal_type: "navigation", source: "google-maps", destination_label: "Gym, Andheri" },
    { location: PUNE_LOCATION,   signal_type: "ride",       source: "uber",        destination_label: "Pune HQ" },
    { location: NY_LOCATION,     signal_type: "navigation", source: "google-maps", destination_label: "Client NYC" }
  ];

  const result = splitTravelSignals(signals, { anchor: MUMBAI_ANCHOR, radius_km: 80 });

  assert.equal(result.commute.length, 2, "Should have 2 commute signals");
  assert.equal(result.business_travel.length, 2, "Should have 2 business travel signals");
  assert.equal(result.unknown.length, 0, "Should have no unknown signals");
});

test("splitTravelSignals places signals with missing anchor in unknown bucket", () => {
  const signals = [
    { location: BANDRA_LOCATION, signal_type: "ride", source: "uber" },
    { location: PUNE_LOCATION,   signal_type: "ride", source: "uber" }
  ];

  const result = splitTravelSignals(signals, {});

  assert.equal(result.unknown.length, 2, "Should have 2 unknown signals (no anchor)");
  assert.equal(result.commute.length, 0);
  assert.equal(result.business_travel.length, 0);
});

test("splitTravelSignals handles empty signals array", () => {
  const result = splitTravelSignals([], { anchor: MUMBAI_ANCHOR });
  assert.equal(result.commute.length, 0);
  assert.equal(result.business_travel.length, 0);
  assert.equal(result.unknown.length, 0);
});

test("splitTravelSignals handles non-array signals input gracefully", () => {
  const result = splitTravelSignals(null, { anchor: MUMBAI_ANCHOR });
  assert.equal(result.commute.length, 0);
  assert.equal(result.business_travel.length, 0);
  assert.equal(result.unknown.length, 0);
});

test("splitTravelSignals all output records have no raw coordinates", () => {
  const signals = [
    { location: BANDRA_LOCATION, signal_type: "ride", source: "uber" },
    { location: PUNE_LOCATION,   signal_type: "ride", source: "uber" }
  ];

  const result = splitTravelSignals(signals, { anchor: MUMBAI_ANCHOR });
  const allRecords = [...result.commute, ...result.business_travel, ...result.unknown];

  for (const record of allRecords) {
    const json = JSON.stringify(record);
    assert.ok(!json.includes(String(BANDRA_LOCATION.lat)), "lat must not appear in output");
    assert.ok(!json.includes(String(PUNE_LOCATION.lat)),   "lat must not appear in output");
  }
});

test("DEFAULT_HOME_RADIUS_KM is 80", () => {
  assert.equal(DEFAULT_HOME_RADIUS_KM, 80);
});

test("TRAVEL_CONTEXT has commute, business_travel, unknown keys", () => {
  assert.equal(TRAVEL_CONTEXT.COMMUTE,         "commute");
  assert.equal(TRAVEL_CONTEXT.BUSINESS_TRAVEL, "business_travel");
  assert.equal(TRAVEL_CONTEXT.UNKNOWN,         "unknown");
});

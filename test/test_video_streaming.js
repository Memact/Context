import assert from 'assert';
/**
 * Core context-shaping engine rule for the video-streaming category.
 * Extracts stable preferences from high-completion watches (>80%)
 * and isolates curiosity/low-confidence anomalies (<15%).
 */
function shapeStreamingContext(rawLog) {
  const stable = { 
    favorite_genres: [], 
    preferred_languages: [], 
    frequent_creators_or_channels: [],
    preferred_content_length: "mixed"
  };
  
  const weak = { 
    recent_curiosity_topics: [], 
    occasional_genres: [] 
  };
  
  let metrics = { 
    shared_device_risk: false, 
    curiosity_click_filtered_count: 0 
  };

  if (!rawLog || !rawLog.activity_log) {
    return { stable_preferences: stable, weak_signals: weak, evaluation_metrics: metrics };
  }

  rawLog.activity_log.forEach(item => {
    // 1. High-Confidence Habit Rules (Completion > 80%)
    if (item.completion_rate > 0.80) {
      item.genres.forEach(g => { 
        if (!stable.favorite_genres.includes(g)) stable.favorite_genres.push(g); 
      });
      if (item.audio_language && !stable.preferred_languages.includes(item.audio_language)) {
        stable.preferred_languages.push(item.audio_language);
      }
      if (item.creator && !stable.frequent_creators_or_channels.includes(item.creator)) {
        stable.frequent_creators_or_channels.push(item.creator);
      }
    } 
    // 2. Weak Signal / Curiosity Click Rules (Completion < 15%)
    else if (item.completion_rate < 0.15) {
      metrics.curiosity_click_filtered_count += 1;
      item.genres.forEach(g => { 
        if (!weak.occasional_genres.includes(g)) weak.occasional_genres.push(g); 
      });
      if (item.title) {
        weak.recent_curiosity_topics.push(item.title);
      }
    }
  });

  return { 
    category: "video-streaming",
    last_updated: new Date().toISOString(),
    stable_preferences: stable, 
    weak_signals: weak, 
    evaluation_metrics: metrics 
  };
}

// ==========================================
// TEST CASES & EMBEDDED MOCK JSON DUMPS
// ==========================================

console.log("🏃 Running Memact Video-Streaming Context Shaping Tests...");

// Test Case 1: Valid Preference Promotion Test
const mockHighEngagementInput = {
  "app_id": "stream_max_plus",
  "activity_log": [
    {
      "video_id": "vid_9921",
      "title": "Advanced Quantum Mechanics Explained",
      "creator": "PhysicsDaily",
      "genres": ["Science", "Education"],
      "duration_seconds": 2400,
      "watched_seconds": 2350,
      "completion_rate": 0.98,
      "audio_language": "en"
    }
  ]
};

const resultHigh = shapeStreamingContext(mockHighEngagementInput);
try {
  assert.deepStrictEqual(resultHigh.stable_preferences.favorite_genres, ["Science", "Education"]);
  assert.deepStrictEqual(resultHigh.stable_preferences.frequent_creators_or_channels, ["PhysicsDaily"]);
  assert.strictEqual(resultHigh.evaluation_metrics.curiosity_click_filtered_count, 0);
  console.log("Test 1 Passed: High-completion watch correctly promoted to stable preferences.");
} catch (err) {
  console.error(" Test 1 Failed:", err.message);
  process.exit(1);
}

// Test Case 2: Curiosity Click Suppression Test
const mockLowEngagementInput = {
  "app_id": "stream_max_plus",
  "activity_log": [
    {
      "video_id": "vid_0012",
      "title": "Top 10 Cursed Food Combos You Won't Believe!",
      "creator": "ClickBaitKing",
      "genres": ["Entertainment", "Comedy"],
      "duration_seconds": 600,
      "watched_seconds": 45,
      "completion_rate": 0.075,
      "audio_language": "en"
    }
  ]
};

const resultLow = shapeStreamingContext(mockLowEngagementInput);
try {
  assert.deepStrictEqual(resultLow.stable_preferences.favorite_genres, []);
  assert.deepStrictEqual(resultLow.weak_signals.occasional_genres, ["Entertainment", "Comedy"]);
  assert.strictEqual(resultLow.evaluation_metrics.curiosity_click_filtered_count, 1);
  console.log("Test 2 Passed: Low-completion curiosity click successfully isolated to weak signals.");
} catch (err) {
  console.error("Test 2 Failed:", err.message);
  process.exit(1);
}

console.log(" All video-streaming schema context tests executed successfully!");
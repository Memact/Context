# `video-streaming` Category Schema

This schema defines how Memact normalizes incoming watch history and user streaming telemetry into stable, user-editable memory entries. 

Following the core product guardrails, this schema strictly separates high-confidence, recurring habits from weak signals or temporary curiosity clicks to prevent a single accidental view from becoming an identity claim.

---


```json
{
  "$schema": "[http://json-schema.org/draft-07/schema#](http://json-schema.org/draft-07/schema#)",
  "title": "VideoStreamingContext",
  "type": "object",
  "required": ["category", "last_updated", "stable_preferences", "weak_signals", "evaluation_metrics"],
  "properties": {
    "category": {
      "type": "string",
      "enum": ["video-streaming"]
    },
    "last_updated": {
      "type": "string",
      "format": "date-time"
    },
    "stable_preferences": {
      "type": "object",
      "description": "High-confidence preferences established through repeated observations and high completion rates.",
      "properties": {
        "favorite_genres": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Genres watched consistently with completion rates > 80%."
        },
        "preferred_languages": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Preferred audio or subtitle languages based on long-term usage."
        },
        "frequent_creators_or_channels": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Content creators or streaming channels frequently consumed."
        },
        "preferred_content_length": {
          "type": "string",
          "enum": ["short_form", "feature_length", "serialized", "mixed"],
          "description": "Typical content duration behavior."
        }
      }
    },
    "weak_signals": {
      "type": "object",
      "description": "Low-confidence markers or curiosity clicks undergoing baseline evaluation.",
      "properties": {
        "recent_curiosity_topics": {
          "type": "array",
          "items": { "type": "string" },
          "description": "One-off trending topics or clickbait subjects being monitored."
        },
        "occasional_genres": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Genres with low completion rates or sporadic viewing windows."
        }
      }
    },
    "evaluation_metrics": {
      "type": "object",
      "description": "Context safety thresholds and boundary risks.",
      "properties": {
        "shared_device_risk": {
          "type": "boolean",
          "description": "Flags potential multi-user usage if viewing patterns switch violently between incompatible segments."
        },
        "curiosity_click_filtered_count": {
          "type": "integer",
          "description": "Total number of low-engagement anomalies safely filtered out."
        }
      }
    }
  }
}

{
  "app_id": "stream_max_plus",
  "timestamp": "2026-06-18T13:00:00Z",
  "activity_log": [
    {
      "video_id": "vid_9921",
      "title": "Advanced Quantum Mechanics Explained",
      "creator": "PhysicsDaily",
      "genres": ["Science", "Education"],
      "duration_seconds": 2400,
      "watched_seconds": 2350,
      "completion_rate": 0.98,
      "audio_language": "en",
      "subtitles_enabled": false
    },
    {
      "video_id": "vid_0012",
      "title": "Top 10 Cursed Food Combos You Won't Believe!",
      "creator": "ClickBaitKing",
      "genres": ["Entertainment", "Comedy"],
      "duration_seconds": 600,
      "watched_seconds": 45,
      "completion_rate": 0.075,
      "audio_language": "en",
      "subtitles_enabled": false
    }
  ]
}

{
  "category": "video-streaming",
  "last_updated": "2026-06-18T13:15:00Z",
  "stable_preferences": {
    "favorite_genres": ["Science", "Education"],
    "preferred_languages": ["en"],
    "frequent_creators_or_channels": ["PhysicsDaily"],
    "preferred_content_length": "serialized"
  },
  "weak_signals": {
    "recent_curiosity_topics": ["Cursed Food Combos"],
    "occasional_genres": ["Entertainment", "Comedy"]
  },
  "evaluation_metrics": {
    "shared_device_risk": false,
    "curiosity_click_filtered_count": 1
  }
}
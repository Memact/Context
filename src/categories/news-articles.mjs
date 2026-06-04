/**
 * News & Articles Category Schema and Context Shaping Module
 * Defines the schema structure, permissions, sensitivity rules,
 * normalization logic, and Wiki templates for news/article apps.
 */

// 1. Schema Field Definitions
export const NEWS_ARTICLES_SCHEMA = {
  category: "news-articles",
  description: "User context shaped from news, articles, and reading activity.",
  fields: {
    durable_interests: {
      type: "Array<Object>",
      description: "Topics demonstrating repeated reading interest over multiple days.",
      item_properties: {
        topic: { type: "String", description: "The categorized topic name." },
        confidence: { type: "Number", description: "Confidence score between 0.0 and 1.0." },
        article_count: { type: "Number", description: "Total articles read on this topic." },
        distinct_days: { type: "Number", description: "Number of unique calendar days of activity." },
        first_seen: { type: "String", description: "ISO timestamp of first read." },
        last_seen: { type: "String", description: "ISO timestamp of most recent read." }
      }
    },
    temporary_interests: {
      type: "Array<Object>",
      description: "One-off curiosity clicks, research tasks, or trending news interactions.",
      item_properties: {
        topic: { type: "String", description: "The categorized topic name." },
        confidence: { type: "Number", description: "Confidence score between 0.0 and 1.0." },
        article_count: { type: "Number", description: "Total articles read on this topic." },
        first_seen: { type: "String", description: "ISO timestamp of first read." },
        last_seen: { type: "String", description: "ISO timestamp of most recent read." },
        reason: { type: "String", description: "Reason for temporary classification (e.g. single_day_burst, curiosity_click)." }
      }
    },
    reading_preferences: {
      type: "Object",
      description: "Preferred content structures, publishers, and habits.",
      properties: {
        preferred_article_lengths: {
          type: "Array<String>",
          description: "Preferred article lengths (short < 3m, medium 3-8m, long > 8m)."
        },
        preferred_formats: {
          type: "Array<String>",
          description: "Preferred article formats (explainers, summaries, deep_dives)."
        },
        preferred_publishers: {
          type: "Array<String>",
          description: "Publishers read frequently."
        },
        reading_cadence: {
          type: "String",
          description: "Identified reading routine/habit pattern."
        }
      }
    },
    skipped_topics: {
      type: "Array<String>",
      description: "Topics the user deliberately skips, hides, or shows extremely low scroll depth on."
    },
    saved_articles: {
      type: "Array<Object>",
      description: "Articles explicitly bookmarked or saved for later.",
      item_properties: {
        title: { type: "String", description: "Article title." },
        url: { type: "String", description: "Article link." },
        topic: { type: "String", description: "Primary topic associated with the article." },
        saved_at: { type: "String", description: "ISO timestamp of when the article was saved." }
      }
    }
  }
};

// 2. Permission Suggestions (Least-Privilege Defaults)
export const NEWS_ARTICLES_PERMISSIONS = [
  {
    scope: "news_articles.preferences.read",
    description: "Read reading format, length, and publisher preferences.",
    sensitive: false,
    default_granted: true
  },
  {
    scope: "news_articles.interests.read",
    description: "Read established durable reading interests. Excludes temporary curiosity or sensitive topics.",
    sensitive: false,
    default_granted: true
  },
  {
    scope: "news_articles.saved.read",
    description: "Read titles and metadata of articles bookmarked by the user.",
    sensitive: false,
    default_granted: false
  },
  {
    scope: "news_articles.activity.read",
    description: "Read complete detailed engagement stats, scroll depths, and skipped topics.",
    sensitive: true,
    default_granted: false
  }
];

// 3. Sensitive Topics Definition
// NOTE: This sensitive keyword list is a draft/heuristic protection rule, not a final sensitivity system.
// Some keywords like "policy" and "government" may over-trigger and are included here as first-pass heuristics.
export const SENSITIVE_TOPIC_RULES = {
  sensitive_keywords: [
    "politics", "election", "democrat", "republican", "government", "policy",
    "religion", "faith", "theology", "prayer", "church", "mosque", "temple", "bible", "quran",
    "health", "medical", "disease", "symptom", "therapy", "clinical", "mental-health", "depression",
    "finance", "stock-tip", "investment-advice", "crypto-speculation", "bankruptcy",
    "sexuality", "ideology"
  ],
  isSensitive: (topicName) => {
    if (!topicName) return false;
    const lower = topicName.toLowerCase();
    return SENSITIVE_TOPIC_RULES.sensitive_keywords.some(keyword => lower.includes(keyword));
  }
};

// 4. Normalization and Shaping Logic
export function normalizeReadingActivity(rawActivity = [], options = {}) {
  const records = Array.isArray(rawActivity) ? rawActivity : [];
  
  // Group activities by topic
  const topicStats = {};
  const savedArticles = [];
  const skippedTopics = new Set();
  const publisherCounts = {};
  const lengthCounts = { short: 0, medium: 0, long: 0 };
  const formatCounts = { explainer: 0, summary: 0, deep_dive: 0 };
  const hourCounts = {};

  records.forEach(record => {
    // 1. Saved Articles
    if (record.action === "save" || record.action === "bookmark") {
      savedArticles.push({
        title: record.title || "Untitled Article",
        url: record.url || "",
        topic: Array.isArray(record.topics) && record.topics[0] ? record.topics[0] : "general",
        saved_at: record.occurred_at || new Date().toISOString()
      });
    }

    // 2. Track Skip Signals
    if (record.action === "skip" || record.action === "hide" || (record.scroll_depth_percent !== undefined && record.scroll_depth_percent < 20)) {
      if (Array.isArray(record.topics)) {
        record.topics.forEach(topic => skippedTopics.add(topic.toLowerCase()));
      }
    }

    // 3. Gather Topic Metrics
    if (record.action === "read" || !record.action) {
      const topics = Array.isArray(record.topics) ? record.topics : ["general"];
      const time = record.occurred_at ? new Date(record.occurred_at) : new Date();
      const dateStr = time.toISOString().slice(0, 10);
      const hour = time.getUTCHours();

      // Reading hour cadence
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;

      // Publisher preferences
      if (record.publisher) {
        publisherCounts[record.publisher] = (publisherCounts[record.publisher] || 0) + 1;
      }

      // Format counts
      if (record.format && formatCounts[record.format] !== undefined) {
        formatCounts[record.format]++;
      }

      // Length counts
      if (record.length_minutes !== undefined) {
        if (record.length_minutes < 3) lengthCounts.short++;
        else if (record.length_minutes <= 8) lengthCounts.medium++;
        else lengthCounts.long++;
      }

      topics.forEach(topic => {
        const topicLower = topic.toLowerCase();
        if (!topicStats[topicLower]) {
          topicStats[topicLower] = {
            topic: topic,
            article_count: 0,
            dates: new Set(),
            first_seen: record.occurred_at || new Date().toISOString(),
            last_seen: record.occurred_at || new Date().toISOString(),
            total_scroll: 0,
            scroll_count: 0
          };
        }
        
        const stat = topicStats[topicLower];
        stat.article_count++;
        stat.dates.add(dateStr);
        
        if (record.occurred_at) {
          if (new Date(record.occurred_at) < new Date(stat.first_seen)) stat.first_seen = record.occurred_at;
          if (new Date(record.occurred_at) > new Date(stat.last_seen)) stat.last_seen = record.occurred_at;
        }

        if (record.scroll_depth_percent !== undefined) {
          stat.total_scroll += record.scroll_depth_percent;
          stat.scroll_count++;
        }
      });
    }
  });

  // Separate into durable and temporary interests
  const durable_interests = [];
  const temporary_interests = [];

  Object.values(topicStats).forEach(stat => {
    const isSensitive = SENSITIVE_TOPIC_RULES.isSensitive(stat.topic);
    const distinctDays = stat.dates.size;
    const isDurable = stat.article_count >= 3 && distinctDays >= 2;

    // Calculate confidence: base score derived from distinct reading days and frequency
    let confidence = Math.min(1.0, (distinctDays * 0.35) + (stat.article_count * 0.05));
    
    // Sensitivity rules: Cap confidence and require confirmation to avoid identity claim
    if (isSensitive) {
      confidence = Math.min(0.4, confidence);
    }

    const avgScroll = stat.scroll_count > 0 ? Math.round(stat.total_scroll / stat.scroll_count) : null;

    if (isDurable && !isSensitive) {
      durable_interests.push({
        topic: stat.topic,
        confidence: parseFloat(confidence.toFixed(2)),
        article_count: stat.article_count,
        distinct_days: distinctDays,
        average_scroll_depth_percent: avgScroll,
        first_seen: stat.first_seen,
        last_seen: stat.last_seen
      });
    } else {
      // Determine temporary reason
      let reason = "single_day_burst";
      if (stat.article_count === 1) {
        reason = "curiosity_click";
      } else if (distinctDays === 1) {
        reason = "single_day_research_binge";
      } else if (isSensitive) {
        reason = "sensitive_topic_protection";
      }

      temporary_interests.push({
        topic: stat.topic,
        confidence: parseFloat(confidence.toFixed(2)),
        article_count: stat.article_count,
        distinct_days: distinctDays,
        average_scroll_depth_percent: avgScroll,
        first_seen: stat.first_seen,
        last_seen: stat.last_seen,
        reason,
        requires_user_confirmation: isSensitive ? true : undefined
      });
    }
  });

  // Sort interests by confidence desc
  durable_interests.sort((a, b) => b.confidence - a.confidence);
  temporary_interests.sort((a, b) => b.confidence - a.confidence);

  // Preferred publishers (read at least twice)
  const preferred_publishers = Object.entries(publisherCounts)
    .filter(([, count]) => count >= 2)
    .map(([pub]) => pub);

  // Preferred formats
  const preferred_formats = Object.entries(formatCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([fmt]) => {
      if (fmt === "summary") return "summaries";
      return fmt + "s";
    });

  // Preferred article lengths
  const preferred_article_lengths = Object.entries(lengthCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([len]) => len);

  // Reading cadence
  let reading_cadence = "intermittent";
  const hours = Object.entries(hourCounts).map(([h, count]) => ({ hour: parseInt(h), count }));
  if (hours.length > 0) {
    hours.sort((a, b) => b.count - a.count);
    const peakHour = hours[0].hour;
    if (peakHour >= 5 && peakHour <= 10) reading_cadence = "morning_reader";
    else if (peakHour >= 11 && peakHour <= 16) reading_cadence = "midday_reader";
    else if (peakHour >= 17 && peakHour <= 22) reading_cadence = "evening_reader";
    else reading_cadence = "night_reader";
  }

  return {
    category: "news-articles",
    durable_interests,
    temporary_interests,
    reading_preferences: {
      preferred_article_lengths,
      preferred_formats,
      preferred_publishers,
      reading_cadence
    },
    skipped_topics: Array.from(skippedTopics),
    saved_articles: savedArticles
  };
}

// 5. Wiki Entry Proposals Generator
export function generateWikiEntries(normalizedContext) {
  const proposals = [];
  const { durable_interests, temporary_interests, reading_preferences } = normalizedContext;

  // Generate durable interest Wiki entries
  durable_interests.forEach(interest => {
    proposals.push({
      id: `wiki_durable_${interest.topic.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      type: "interest",
      sub_type: "durable",
      proposed_text: `Recently reads several articles about ${interest.topic}.`,
      raw_source_summary: `Detected across ${interest.article_count} articles over ${interest.distinct_days} different days.`,
      confidence: interest.confidence,
      requires_user_confirmation: false,
      actions: ["approve", "edit", "reject", "delete"]
    });
  });

  // Generate temporary interest Wiki entries (avoiding identity claims)
  temporary_interests.forEach(interest => {
    const isSensitive = interest.requires_user_confirmation === true;
    let proposed_text = `Has recently explored articles about ${interest.topic}.`;
    
    if (isSensitive) {
      proposed_text = `Has occasionally looked up ${interest.topic} topics (temporary research or curiosity).`;
    } else if (interest.reason === "curiosity_click") {
      proposed_text = `Briefly looked into ${interest.topic} recently.`;
    }

    proposals.push({
      id: `wiki_temporary_${interest.topic.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      type: "interest",
      sub_type: "temporary",
      proposed_text,
      raw_source_summary: isSensitive 
        ? "Protected topic read detected. Treated as temporary research click to avoid permanent identity claim."
        : `Detected ${interest.article_count} read(s) under temporary curiosity rules.`,
      confidence: interest.confidence,
      requires_user_confirmation: isSensitive,
      actions: ["approve", "edit", "reject", "delete"]
    });
  });

  // Generate preference Wiki entries
  const { preferred_article_lengths, preferred_formats, preferred_publishers, reading_cadence } = reading_preferences;

  if (preferred_article_lengths.length > 0) {
    proposals.push({
      id: "wiki_pref_length",
      type: "preference",
      sub_type: "article_length",
      proposed_text: `Prefers ${preferred_article_lengths[0]}-length articles.`,
      raw_source_summary: "Calculated based on article reading duration metadata.",
      confidence: 0.8,
      requires_user_confirmation: false,
      actions: ["approve", "edit", "reject"]
    });
  }

  if (preferred_formats.length > 0) {
    proposals.push({
      id: "wiki_pref_format",
      type: "preference",
      sub_type: "article_format",
      proposed_text: `Often reads long-form ${preferred_formats[0]}.`,
      raw_source_summary: "Derived from content format patterns.",
      confidence: 0.75,
      requires_user_confirmation: false,
      actions: ["approve", "edit", "reject"]
    });
  }

  if (preferred_publishers.length > 0) {
    proposals.push({
      id: "wiki_pref_publisher",
      type: "preference",
      sub_type: "publisher",
      proposed_text: `Regularly reads articles from ${preferred_publishers.join(" and ")}.`,
      raw_source_summary: "Frequent publisher interaction detected in history.",
      confidence: 0.85,
      requires_user_confirmation: false,
      actions: ["approve", "edit", "reject"]
    });
  }

  if (reading_cadence && reading_cadence !== "intermittent") {
    let cadenceText = `Often reads articles in the ${reading_cadence.replace("_reader", "")}.`;
    if (reading_cadence === "night_reader") {
      cadenceText = "Often reads articles at night.";
    }
    proposals.push({
      id: "wiki_pref_cadence",
      type: "preference",
      sub_type: "reading_cadence",
      proposed_text: cadenceText,
      raw_source_summary: "Generated from peak daily reading hour activity.",
      confidence: 0.7,
      requires_user_confirmation: false,
      actions: ["approve", "edit", "reject"]
    });
  }

  return proposals;
}

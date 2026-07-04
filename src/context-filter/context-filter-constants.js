/**
 * Context Filter Constants for Entertainment vs Productivity
 */

const DOMAIN_TYPES = {
  ENTERTAINMENT: 'entertainment',
  PRODUCTIVITY: 'productivity',
  GENERAL: 'general'
};

const APP_CATEGORIES = {
  ENTERTAINMENT: [
    'spotify',
    'netflix',
    'youtube',
    'apple_music',
    'amazon_prime',
    'hulu',
    'disney_plus',
    'media_playback',
    'music',
    'video',
    'streaming'
  ],
  PRODUCTIVITY: [
    'slack',
    'notion',
    'teams',
    'google_docs',
    'figma',
    'github',
    'cursor',
    'workspace',
    'productivity'
  ]
};

const MEDIA_SCHEMAS = {
  music: ['playlist', 'song', 'track', 'album', 'artist', 'genre'],
  video: ['movie', 'tv_show', 'episode', 'series', 'watch_time'],
  playback: ['playback', 'listen', 'watch', 'stream', 'playing']
};

const BLOCK_RULES = {
  entertainment_to_productivity: {
    blockedSchemas: ['music', 'video', 'playback'],
    blockedCategories: ['spotify', 'netflix', 'youtube', 'media_playback'],
    action: 'block',
    priority: 10
  }
};

const FILTER_ACTION = {
  BLOCK: 'block',
  ALLOW: 'allow',
  WARN: 'warn'
};

module.exports = {
  DOMAIN_TYPES,
  APP_CATEGORIES,
  MEDIA_SCHEMAS,
  BLOCK_RULES,
  FILTER_ACTION
};
/**
 * Seasonal Constants for Memact Context
 * Defines seasons, genres, and decay curve configurations
 */

const SEASONS = {
  SUMMER: 'summer',
  WINTER: 'winter',
  SPRING: 'spring',
  FALL: 'fall',
  HOLIDAY: 'holiday'
};

// Northern hemisphere seasons
const SEASON_DATES = {
  [SEASONS.SUMMER]: {
    start: { month: 5, day: 21 }, // May 21
    end: { month: 8, day: 20 }    // August 20
  },
  [SEASONS.WINTER]: {
    start: { month: 11, day: 21 }, // November 21
    end: { month: 2, day: 20 }     // February 20
  },
  [SEASONS.SPRING]: {
    start: { month: 2, day: 21 },  // February 21
    end: { month: 5, day: 20 }     // May 20
  },
  [SEASONS.FALL]: {
    start: { month: 8, day: 21 },  // August 21
    end: { month: 11, day: 20 }    // November 20
  },
  [SEASONS.HOLIDAY]: {
    start: { month: 11, day: 15 }, // November 15
    end: { month: 1, day: 5 }      // January 5
  }
};

// Seasonal genre mappings with boost factors
const SEASONAL_GENRES = {
  [SEASONS.SUMMER]: {
    genres: ['pop', 'dance', 'electronic', 'reggae', 'tropical', 'house', 'techno', 'disco'],
    boost: 0.8,
    description: 'Upbeat, energetic summer vibes',
    emoji: '☀️'
  },
  [SEASONS.WINTER]: {
    genres: ['classical', 'jazz', 'ambient', 'folk', 'indie', 'acoustic', 'piano', 'orchestral'],
    boost: 0.8,
    description: 'Cozy, warm winter ambiance',
    emoji: '❄️'
  },
  [SEASONS.SPRING]: {
    genres: ['acoustic', 'folk', 'indie', 'pop', 'alternative', 'dream-pop', 'country'],
    boost: 0.5,
    description: 'Fresh, uplifting spring energy',
    emoji: '🌸'
  },
  [SEASONS.FALL]: {
    genres: ['alternative', 'folk', 'indie', 'acoustic', 'blues', 'soul', 'r-b', 'country'],
    boost: 0.5,
    description: 'Melancholic, reflective fall atmosphere',
    emoji: '🍂'
  },
  [SEASONS.HOLIDAY]: {
    genres: ['classical', 'jazz', 'vocal', 'choir', 'orchestral', 'holiday'],
    boost: 0.9,
    description: 'Festive holiday spirit',
    emoji: '🎄'
  }
};

// Decay curve configurations
const DECAY_CURVES = {
  SHARP: {
    type: 'exponential',
    rate: 0.3,
    peak: 1.0,
    floor: 0.1,
    description: 'Sharp decay - fast falloff outside season'
  },
  GRADUAL: {
    type: 'linear',
    slope: 0.02,
    peak: 1.0,
    floor: 0.2,
    description: 'Gradual decay - slow, steady falloff'
  },
  MODERATE: {
    type: 'sigmoid',
    steepness: 0.5,
    peak: 1.0,
    floor: 0.15,
    description: 'Moderate decay - S-curve transition'
  },
  HOLIDAY: {
    type: 'gaussian',
    peak: 1.0,
    floor: 0.05,
    width: 0.4,
    description: 'Holiday decay - sharp peak with long tail'
  }
};

// Default decay curve for each season
const DEFAULT_CURVES = {
  [SEASONS.SUMMER]: 'MODERATE',
  [SEASONS.WINTER]: 'MODERATE',
  [SEASONS.SPRING]: 'GRADUAL',
  [SEASONS.FALL]: 'GRADUAL',
  [SEASONS.HOLIDAY]: 'HOLIDAY'
};

// Seasonal emojis mapping
const SEASON_EMOJIS = {
  [SEASONS.SUMMER]: '☀️',
  [SEASONS.WINTER]: '❄️',
  [SEASONS.SPRING]: '🌸',
  [SEASONS.FALL]: '🍂',
  [SEASONS.HOLIDAY]: '🎄'
};

module.exports = {
  SEASONS,
  SEASON_DATES,
  SEASONAL_GENRES,
  DECAY_CURVES,
  DEFAULT_CURVES,
  SEASON_EMOJIS
};
/**
 * Date Utilities for Seasonal Calculations
 * Handles date parsing, range checking, and season detection
 */

/**
 * Parse a date string or return current date
 * @param {string|Date} date - Date to parse
 * @returns {Date} Parsed date
 */
function parseDate(date) {
  if (date instanceof Date) return date;
  if (typeof date === 'string') return new Date(date);
  return new Date();
}

/**
 * Check if a date falls within a seasonal range
 * @param {Date} date - Date to check
 * @param {Object} start - Start date {month, day}
 * @param {Object} end - End date {month, day}
 * @returns {boolean} True if date is in range
 */
function isDateInRange(date, start, end) {
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();

  // Handle year wrap (e.g., holiday season)
  if (start.month > end.month) {
    const inRange1 = (month > start.month) || (month === start.month && day >= start.day);
    const inRange2 = (month < end.month) || (month === end.month && day <= end.day);
    return inRange1 || inRange2;
  }

  // Normal season
  if (month > start.month && month < end.month) return true;
  if (month === start.month && day >= start.day) return true;
  if (month === end.month && day <= end.day) return true;
  return false;
}

/**
 * Calculate days until a target date
 * @param {Object} target - {month, day}
 * @param {Date} fromDate - Date to calculate from
 * @returns {number} Days until target
 */
function daysUntil(target, fromDate = new Date()) {
  const targetDate = new Date(fromDate.getFullYear(), target.month - 1, target.day);
  if (targetDate < fromDate) {
    targetDate.setFullYear(targetDate.getFullYear() + 1);
  }
  return Math.ceil((targetDate - fromDate) / (1000 * 60 * 60 * 24));
}

/**
 * Get the midpoint of a season
 * @param {Object} dates - Season dates {start, end}
 * @returns {Object} Midpoint {month, day}
 */
function getSeasonMidpoint(dates) {
  const start = dates.start;
  const end = dates.end;
  
  // Handle year wrap
  if (start.month > end.month) {
    const daysInStart = 30 - start.day;
    const daysInEnd = end.day;
    const midDays = Math.floor((daysInStart + daysInEnd) / 2);
    
    if (midDays <= daysInStart) {
      return { month: start.month, day: start.day + midDays };
    } else {
      const remaining = midDays - daysInStart;
      return { month: end.month, day: remaining };
    }
  }

  // Normal season
  const startDate = new Date(2000, start.month - 1, start.day);
  const endDate = new Date(2000, end.month - 1, end.day);
  const midDate = new Date((startDate.getTime() + endDate.getTime()) / 2);
  
  return { month: midDate.getMonth() + 1, day: midDate.getDate() };
}

/**
 * Get season name from date
 * @param {Date} date - Date to check
 * @param {Object} seasonDates - Season definitions
 * @param {Object} SEASONS - Season constants
 * @returns {string} Season name
 */
function getSeasonFromDate(date, seasonDates, SEASONS) {
  const month = date.getMonth(); // 0-11
  const day = date.getDate();

  // Check each season
  for (const [season, dates] of Object.entries(seasonDates)) {
    if (isDateInRange(date, dates.start, dates.end)) {
      return season;
    }
  }

  // Fallback to astronomical seasons
  if (month >= 5 && month <= 7) return SEASONS.SUMMER;
  if (month >= 11 || month <= 1) return SEASONS.WINTER;
  if (month >= 2 && month <= 4) return SEASONS.SPRING;
  if (month >= 8 && month <= 10) return SEASONS.FALL;

  return SEASONS.SPRING;
}

/**
 * Format date to ISO string
 * @param {Date} date - Date to format
 * @returns {string} ISO date string
 */
function toISOString(date) {
  return date.toISOString();
}

/**
 * Get current date in UTC
 * @returns {Date} Current UTC date
 */
function getUTCDate() {
  return new Date();
}

module.exports = {
  parseDate,
  isDateInRange,
  daysUntil,
  getSeasonMidpoint,
  getSeasonFromDate,
  toISOString,
  getUTCDate
};
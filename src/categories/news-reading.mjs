/**
 * src/categories/news-reading.mjs
 */

export const newsReadingCategory = {
  name: 'news-reading',
  description: 'Models user reading habits, including preferred publishers, avoided topics, and article length.',

  /**
   * Normalizes incoming user profile or behavioral data into a structured format.
   * @param {Object} rawData - The raw input payload.
   * @returns {Object} The normalized news-reading context.
   */
  normalize(rawData = {}) {
    const defaultCategories = ['technology', 'local news', 'science'];
    const defaultLengths = ['short summaries', 'long-form'];

    // 1. Process Preferred Categories
    let preferredCategories = Array.isArray(rawData.preferredCategories)
      ? rawData.preferredCategories.map(c => String(c).toLowerCase().trim())
      : defaultCategories;
    
    if (preferredCategories.length === 0) {
      preferredCategories = defaultCategories;
    }

    // 2. Process Avoided Topics / Politics Filters
    let avoidedTopics = Array.isArray(rawData.avoidedTopics)
      ? rawData.avoidedTopics.map(t => String(t).toLowerCase().trim())
      : ['politics']; // Default safe fallback

    // 3. Process Preferred Article Length
    let preferredLength = String(rawData.preferredLength || 'short summaries')
      .toLowerCase()
      .trim();
    
    if (!defaultLengths.includes(preferredLength)) {
      preferredLength = 'short summaries'; // Fallback to safe default
    }

    return {
      preferredCategories,
      avoidedTopics,
      preferredLength
    };
  },

  /**
   * Generates system prompt templates or context injections based on the reading habits.
   * @param {Object} context - The normalized context payload.
   * @returns {String} A formatted string for context injection.
   */
  template(context) {
    const { preferredCategories, avoidedTopics, preferredLength } = context;
    
    return [
      `[User News Profile]`,
      `- Target Categories: ${preferredCategories.join(', ')}`,
      `- Excluded Topics/Filters: ${avoidedTopics.join(', ')}`,
      `- Reading Format Preference: ${preferredLength}`,
      `Strict Rule: Ensure recommendations or content heavily align with the Target Categories, strictly filter out the Excluded Topics, and match the specified Reading Format Preference.`
    ].join('\n');
  }
};
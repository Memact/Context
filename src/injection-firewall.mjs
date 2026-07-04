// src/injection-firewall.mjs

// 🚨 List of known adversarial prompt injection patterns
const ADVERSARIAL_PATTERNS = [
    /forget\s+(all|everything|previous)/i,
    /ignore\s+(all|previous)\s+(instructions|context)/i,
    /you\s+must\s+(now\s+)?remember/i,
    /overwrite\s+(identity|memory|preferences)/i,
    /bypass\s+(security|rules|guardrails)/i,
    /system\s+prompt/i
];

// 📊 Trust Hierarchy (Provenance Tracking)
export const TRUST_LEVELS = {
    USER_INPUT: 100,           // Cryptographically signed / direct from authenticated user
    AUTHORIZED_APP: 50,        // From a verified third-party app
    UNVERIFIED_EXTERNAL: 0     // Scraped web data, emails, third-party payloads
};

/**
 * Sanitization Engine: Evaluates incoming context payload for adversarial injection.
 * @param {string} payloadText - The raw text of the incoming context.
 * @param {string} source - The provenance source (USER_INPUT, AUTHORIZED_APP, UNVERIFIED_EXTERNAL).
 * @returns {Object} Result object containing safety status and quarantine details.
 */
export function evaluateContextPayload(payloadText, source = 'UNVERIFIED_EXTERNAL') {
    const trustScore = TRUST_LEVELS[source] !== undefined ? TRUST_LEVELS[source] : TRUST_LEVELS.UNVERIFIED_EXTERNAL;
    const textToAnalyze = (payloadText || '').toString();

    const hasMaliciousIntent = ADVERSARIAL_PATTERNS.some(pattern => pattern.test(textToAnalyze));

    if (hasMaliciousIntent) {
        // Direct unverified commands must be quarantined
        if (trustScore < TRUST_LEVELS.USER_INPUT) {
            return {
                isSafe: false,
                reason: `🚨 Malicious intent detected from untrusted source (${source}). Payload quarantined to protect identity matrix.`,
                trustScore
            };
        }
        
        // If the user themselves typed "forget everything", we might allow it, but flag it.
        return {
            isSafe: true,
            reason: `⚠️ Adversarial pattern detected but allowed due to high trust source (${source}).`,
            trustScore
        };
    }

    return {
        isSafe: true,
        reason: 'Payload is clean.',
        trustScore
    };
}
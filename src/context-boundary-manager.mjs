// src/context-boundary-manager.mjs

// 🎭 Define valid AI Personas
export const PERSONA_TOKENS = {
    WORK_ASSISTANT: 'work_assistant',
    HEALTH_COACH: 'health_coach',
    PERSONAL_AIDE: 'personal_aide'
};

// 🗄️ Map Personas to Authorized Context Shards (The Graph Boundaries)
const SHARD_PERMISSIONS = {
    [PERSONA_TOKENS.WORK_ASSISTANT]: ['developer_workspace', 'professional_network'],
    [PERSONA_TOKENS.HEALTH_COACH]: ['medical_health', 'fitness_tracking', 'diet_nutrition'],
    [PERSONA_TOKENS.PERSONAL_AIDE]: ['general_lifestyle', 'entertainment', 'travel']
};

/**
 * Persona Firewall: Validates if an AI persona is authorized to query a specific context shard.
 * @param {string} personaToken - The active persona role requesting data.
 * @param {string} targetShard - The contextual domain being queried.
 * @returns {Object} Access result with authorization status and optional error.
 */
export function validateContextAccess(personaToken, targetShard) {
    const allowedShards = SHARD_PERMISSIONS[personaToken];

    // 1. Block invalid or unknown personas immediately
    if (!allowedShards) {
        return {
            authorized: false,
            error: `🚨 Authentication Failed: Unknown or missing Persona Token '${personaToken}'.`
        };
    }

    // 2. Strict Boundary Check: Block cross-contamination
    if (!allowedShards.includes(targetShard)) {
        return {
            authorized: false,
            error: `🧱 Persona Firewall Block: The '${personaToken}' persona is strictly forbidden from accessing the '${targetShard}' shard.`
        };
    }

    // 3. Authorized access
    return {
        authorized: true,
        message: `✅ Access granted for '${personaToken}' to query '${targetShard}'.`
    };
}
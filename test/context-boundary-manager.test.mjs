// test/context-boundary-manager.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateContextAccess, PERSONA_TOKENS } from '../src/context-boundary-manager.mjs';

test('🛡️ Multi-Persona Context Sharding & RBAC Isolation', async (t) => {

    await t.test('Should ALLOW Work Assistant to access Developer Workspace shard', () => {
        const result = validateContextAccess(PERSONA_TOKENS.WORK_ASSISTANT, 'developer_workspace');
        assert.strictEqual(result.authorized, true);
    });

    await t.test('Should BLOCK Work Assistant from accessing Medical Health shard (Zero Cross-Contamination)', () => {
        const result = validateContextAccess(PERSONA_TOKENS.WORK_ASSISTANT, 'medical_health');
        assert.strictEqual(result.authorized, false);
        assert.match(result.error, /Persona Firewall Block/);
        assert.match(result.error, /strictly forbidden/);
    });

    await t.test('Should ALLOW Health Coach to access Diet & Nutrition shard', () => {
        const result = validateContextAccess(PERSONA_TOKENS.HEALTH_COACH, 'diet_nutrition');
        assert.strictEqual(result.authorized, true);
    });

    await t.test('Should BLOCK Health Coach from accessing Developer Workspace shard', () => {
        const result = validateContextAccess(PERSONA_TOKENS.HEALTH_COACH, 'developer_workspace');
        assert.strictEqual(result.authorized, false);
    });

    await t.test('Should BLOCK access entirely if an invalid Persona Token is provided', () => {
        const result = validateContextAccess('hacked_admin_token', 'developer_workspace');
        assert.strictEqual(result.authorized, false);
        assert.match(result.error, /Authentication Failed/);
    });

});
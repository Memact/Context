// test/context-merger.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { ContextCRDT } from '../src/context-merger.mjs';

test('🌐 Distributed Context Synchronization via CRDTs', async (t) => {

    await t.test('Should merge disjoint offline updates perfectly', () => {
        const edge = new ContextCRDT('mobile_edge');
        const cloud = new ContextCRDT('cloud_server');

        // Edge goes offline and reads a book
        edge.addOrUpdateClaim('ctx_1', { activity: 'reading' });
        
        // Cloud simultaneously registers a background update
        cloud.addOrUpdateClaim('ctx_2', { activity: 'coding' });

        // Sync Edge -> Cloud
        cloud.merge(edge.exportState());
        
        const finalGraph = cloud.getResolvedGraph();
        assert.strictEqual(finalGraph.length, 2);
        assert.ok(finalGraph.find(n => n.id === 'ctx_1' && n.activity === 'reading'));
        assert.ok(finalGraph.find(n => n.id === 'ctx_2' && n.activity === 'coding'));
    });

    await t.test('Conflict Resolution: Highest logical clock wins during concurrent updates', () => {
        const edge = new ContextCRDT('mobile_edge');
        const cloud = new ContextCRDT('cloud_server');

        // Initial sync state (they both have the same baseline)
        edge.addOrUpdateClaim('ctx_1', { status: 'idle' });
        cloud.merge(edge.exportState());

        // Network partition happens. Both update the EXACT SAME context ID.
        // Cloud updates it once.
        cloud.addOrUpdateClaim('ctx_1', { status: 'working_on_cloud' }); // Clock becomes 2
        
        // Edge updates it TWICE offline (Highest clock should win).
        edge.addOrUpdateClaim('ctx_1', { status: 'running_offline' }); // Clock 2
        edge.addOrUpdateClaim('ctx_1', { status: 'finished_offline' }); // Clock 3

        // Reconnect and Merge
        cloud.merge(edge.exportState());
        
        const finalGraph = cloud.getResolvedGraph();
        assert.strictEqual(finalGraph.length, 1);
        // Edge's update wins because it had a higher logical clock (3 > 2)
        assert.strictEqual(finalGraph[0].status, 'finished_offline');
    });

    await t.test('Commutativity: Merge order does not matter (A U B === B U A)', () => {
        const edge = new ContextCRDT('node_A');
        const cloud = new ContextCRDT('node_B');

        // Concurrent exact same clock tick but different data
        edge.addOrUpdateClaim('target_node', { val: 'Edge_Data' });
        cloud.addOrUpdateClaim('target_node', { val: 'Cloud_Data' });

        // Scenario 1: Edge merges into Cloud
        const cloudClone = new ContextCRDT('node_B');
        cloudClone.state = new Map(cloud.exportState());
        cloudClone.logicalClock = cloud.logicalClock;
        cloudClone.merge(edge.exportState());
        
        // Scenario 2: Cloud merges into Edge
        const edgeClone = new ContextCRDT('node_A');
        edgeClone.state = new Map(edge.exportState());
        edgeClone.logicalClock = edge.logicalClock;
        edgeClone.merge(cloud.exportState());

        const graph1 = cloudClone.getResolvedGraph();
        const graph2 = edgeClone.getResolvedGraph();

        // Both nodes must reach the exact same mathematical state despite different merge directions
        // (Tie breaker kicks in: 'node_B' > 'node_A' lexicographically, so Cloud wins)
        assert.deepEqual(graph1, graph2);
        assert.strictEqual(graph1[0].val, 'Cloud_Data'); 
    });
});
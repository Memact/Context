/**
 * Memact Engine - Cascading Purge Middleware
 * Implements "Right to be Forgotten" by recursively deleting derived contextual nodes.
 */

export function cascadePurge(targetClaimId, contextGraph) {
  if (!targetClaimId || !Array.isArray(contextGraph)) {
    return contextGraph;
  }

  // Set to keep track of all IDs that need to be purged
  const idsToDelete = new Set([targetClaimId]);
  let graphChanged = true;

  // Traverse the graph repeatedly until no new child nodes are found
  while (graphChanged) {
    graphChanged = false;
    
    for (const claim of contextGraph) {
      if (idsToDelete.has(claim.id)) continue; // Already marked for deletion

      // If the claim has parents, check if any parent is marked for deletion
      if (Array.isArray(claim.parent_claim_id)) {
        const hasDeletedParent = claim.parent_claim_id.some(parentId => idsToDelete.has(parentId));
        
        if (hasDeletedParent) {
          idsToDelete.add(claim.id);
          graphChanged = true; // Trigger another pass to find children of this new child
        }
      }
    }
  }

  // Return the new filtered graph, keeping only the surviving nodes
  return contextGraph.filter(claim => !idsToDelete.has(claim.id));
}
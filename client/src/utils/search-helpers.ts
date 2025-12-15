import { Node } from '@xyflow/react';
import { TechnicalProfile, ClaimReference } from '@/types/technical-profile';
import { NODE_TYPES } from '@/components/nodeTypes';

/**
 * Extracts searchable text content from a ReactFlow node
 * Uses caching to avoid repeated extractions
 */
export const createNodeContentExtractor = () => {
  const contentCache = new Map<string, string[]>();

  return (node: Node): string[] => {
    if (contentCache.has(node.id)) {
      return contentCache.get(node.id)!;
    }

    const content: string[] = [node.id];

    if (!node.data) {
      contentCache.set(node.id, content);
      return content;
    }

    switch (node.type) {
      case NODE_TYPES.GROUP:
        if (node.data.label) content.push(String(node.data.label));
        if (node.data.details) {
          content.push(
            typeof node.data.details === 'string'
              ? node.data.details
              : JSON.stringify(node.data.details)
          );
        }
        break;

      case NODE_TYPES.CLAIMS_EXCHANGE:
        if (node.data.label) content.push(String(node.data.label));
        if (Array.isArray(node.data.claimsExchanges)) {
          content.push(...node.data.claimsExchanges.map(String));
        }
        if (Array.isArray(node.data.technicalProfiles)) {
          node.data.technicalProfiles.forEach((profile: TechnicalProfile) => {
            if (profile.id) content.push(profile.id);
            if (profile.displayName) content.push(profile.displayName);
            if (profile.providerName) content.push(profile.providerName);
            if (profile.description) content.push(profile.description);

            const addClaimReferences = (claims: ClaimReference[]) => {
              claims.forEach((claim) => {
                if (claim.claimTypeReferenceId) {
                  content.push(claim.claimTypeReferenceId);
                }
              });
            };

            if (Array.isArray(profile.inputClaims)) {
              addClaimReferences(profile.inputClaims);
            }
            if (Array.isArray(profile.outputClaims)) {
              addClaimReferences(profile.outputClaims);
            }
          });
        }
        break;

      case NODE_TYPES.COMBINED_SIGNIN_SIGNUP:
        if (node.data.label) content.push(String(node.data.label));
        if (Array.isArray(node.data.claimsExchanges)) {
          content.push(...node.data.claimsExchanges.map(String));
        }
        break;

      case NODE_TYPES.CONDITIONED:
        if (node.data.label) content.push(String(node.data.label));
        if (node.data.details) {
          content.push(
            typeof node.data.details === 'string'
              ? node.data.details
              : JSON.stringify(node.data.details)
          );
        }
        break;

      case NODE_TYPES.COMMENT:
        if (node.data.label) content.push(String(node.data.label));
        break;

      default:
        if (node.data.label) content.push(String(node.data.label));
        if (node.data.title) content.push(String(node.data.title));
        if (node.data.subtitle) content.push(String(node.data.subtitle));
        break;
    }

    contentCache.set(node.id, content);
    return content;
  };
};

/**
 * Finds related EndNodes based on parent-child relationships
 */
export const findRelatedEndNodes = (
  matchingNodeIds: string[],
  nodes: Node[],
  endNodes: Node[]
): Set<string> => {
  const relatedEndNodes = new Set<string>();
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  matchingNodeIds.forEach((nodeId) => {
    const matchingNode = nodeMap.get(nodeId);
    if (!matchingNode) return;

    if (matchingNode.parentId) {
      endNodes.forEach((endNode) => {
        if (endNode.parentId === matchingNode.parentId) {
          relatedEndNodes.add(endNode.id);
        }
      });
    }
  });

  return relatedEndNodes;
};

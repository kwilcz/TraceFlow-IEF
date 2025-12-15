import { usePolicySearch } from '@hooks/use-policy-search';

export interface NodeHighlightInfo {
  isHighlighted: boolean;
  isFocused: boolean;
  isEndNodeHighlighted: boolean;
}

/**
 * Hook to get highlighting information for a node
 */
export const useNodeHighlight = (nodeId: string, nodeType?: string): NodeHighlightInfo => {
  const { highlightedNodes, highlightedEndNodes, focusedNodeId } = usePolicySearch();
  
  return {
    isHighlighted: highlightedNodes.has(nodeId),
    isFocused: focusedNodeId === nodeId,
    isEndNodeHighlighted: nodeType === 'EndNode' && highlightedEndNodes.has(nodeId)
  };
};

/**
 * Get CSS classes for node highlighting
 */
export const getNodeHighlightClasses = (highlight: NodeHighlightInfo): string => {
  const classes: string[] = [];
  
  if (highlight.isFocused) {
    classes.push('search-highlight-focus');
  } else if (highlight.isHighlighted) {
    classes.push('search-highlight-match');
  }
  
  if (highlight.isEndNodeHighlighted) {
    classes.push('search-highlight-end-node');
  }
  
  return classes.join(' ');
};

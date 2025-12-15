import { useEffect, useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import useReactFlowStore from '@hooks/use-react-flow-store';
import useSearchStore from '@hooks/use-search-store';
import { useDebounce } from '@hooks/use-debounce';

export interface SearchResult {
  nodeId: string;
  nodeType: string;
  matchedContent: string[];
  relatedEndNodes: string[];
}

/**
 * Deep search hook for policy nodes
 * Performs comprehensive search through all node content and identifies related EndNodes
 */
export const usePolicySearch = () => {
  const { nodes, edges } = useReactFlowStore();
  const reactFlow = useReactFlow();
  const {
    searchTerm,
    setSearchTerm,
    searchResults,
    highlightedNodes,
    highlightedEndNodes,
    currentResultIndex,
    focusedNodeId,
    clearSearch,
    navigateToNext,
    navigateToPrevious,
    updateSearchResults
  } = useSearchStore();

  // Debounced search function
  const debouncedSearch = useDebounce(() => {
    updateSearchResults(nodes);
  }, 300);

  // Update search results when nodes or edges change
  useEffect(() => {
    if (searchTerm) {
      debouncedSearch();
    }
  }, [nodes, edges, searchTerm, debouncedSearch]);

  // Clear search when search term is empty
  useEffect(() => {
    if (!searchTerm) {
      updateSearchResults([]);
    }
  }, [searchTerm, updateSearchResults]);

  /**
   * Focus on a specific node by centering the viewport on it
   */
  const focusOnNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node && reactFlow) {
      // Get CSS variables for zoom/focus settings
      const duration = parseInt(
        getComputedStyle(document.documentElement)
          .getPropertyValue('--search-zoom-speed') || '800'
      );
      const padding = parseFloat(
        getComputedStyle(document.documentElement)
          .getPropertyValue('--search-focus-padding') || '0.3'
      );
      
      // Center the viewport on the node with smooth animation
      reactFlow.fitView({
        nodes: [node],
        duration,
        padding: padding,
        minZoom: 0.1,
        maxZoom: 0.75
      });
    }
  }, [nodes, reactFlow]);

  // Focus on the current result when it changes
  useEffect(() => {
    if (focusedNodeId) {
      focusOnNode(focusedNodeId);
    }
  }, [focusedNodeId, focusOnNode]);

  return {
    searchTerm,
    setSearchTerm,
    searchResults,
    highlightedEndNodes,
    highlightedNodes,
    currentResultIndex,
    focusedNodeId,
    navigateToNext,
    navigateToPrevious,
    clearSearch
  };
};

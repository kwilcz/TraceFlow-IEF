import { create } from 'zustand';
import { Node } from '@xyflow/react';
import { createNodeContentExtractor, findRelatedEndNodes } from '@/utils/search-helpers';

export interface SearchResult {
  nodeId: string;
  nodeType: string;
  matchedContent: string[];
  relatedEndNodes: string[];
}

interface SearchState {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchResults: SearchResult[];
  highlightedNodes: Set<string>;
  highlightedEndNodes: Set<string>;
  currentResultIndex: number;
  focusedNodeId: string | null;
  clearSearch: () => void;
  navigateToNext: () => void;
  navigateToPrevious: () => void;
  updateSearchResults: (nodes: Node[]) => void;
}

const clearSearchState = () => ({
  searchResults: [],
  highlightedNodes: new Set<string>(),
  highlightedEndNodes: new Set<string>(),
  currentResultIndex: -1,
  focusedNodeId: null,
});

/**
 * Zustand store for managing policy search state
 * 
 * Provides search functionality across policy flow nodes with:
 * - Text-based search across node content
 * - Result highlighting and navigation
 * - Related EndNode discovery
 */
const useSearchStore = create<SearchState>((set, get) => ({
  searchTerm: '',
  setSearchTerm: (term: string) => {
    set({ searchTerm: term });
  },
  searchResults: [],
  highlightedNodes: new Set(),
  highlightedEndNodes: new Set(),
  currentResultIndex: -1,
  focusedNodeId: null,
  clearSearch: () => {
    set({
      searchTerm: '',
      ...clearSearchState(),
    });
  },
  navigateToNext: () => {
    const { searchResults, currentResultIndex } = get();
    if (searchResults.length === 0) return;

    const nextIndex = (currentResultIndex + 1) % searchResults.length;
    const nextNodeId = searchResults[nextIndex].nodeId;
    set({ currentResultIndex: nextIndex, focusedNodeId: nextNodeId });
  },
  navigateToPrevious: () => {
    const { searchResults, currentResultIndex } = get();
    if (searchResults.length === 0) return;

    const prevIndex = currentResultIndex <= 0 ? searchResults.length - 1 : currentResultIndex - 1;
    const prevNodeId = searchResults[prevIndex].nodeId;
    set({ currentResultIndex: prevIndex, focusedNodeId: prevNodeId });
  },
  updateSearchResults: (nodes: Node[]) => {
    const { searchTerm } = get();
    
    if (!searchTerm.trim()) {
      set(clearSearchState());
      return;
    }

    const results: SearchResult[] = [];
    const matchingNodeIds: string[] = [];
    const endNodes = nodes.filter((node) => node.type === 'EndNode');
    
    const getNodeContent = createNodeContentExtractor();
    const searchTermLower = searchTerm.toLowerCase();

    nodes.forEach((node) => {
      const content = getNodeContent(node);
      const matchedContent = content.filter((text) =>
        text.toLowerCase().includes(searchTermLower)
      );

      if (matchedContent.length > 0) {
        matchingNodeIds.push(node.id);
        results.push({
          nodeId: node.id,
          nodeType: node.type || 'unknown',
          matchedContent,
          relatedEndNodes: [],
        });
      }
    });

    const relatedEndNodes = findRelatedEndNodes(matchingNodeIds, nodes, endNodes);
    const relatedEndNodesArray = Array.from(relatedEndNodes);

    results.forEach((result) => {
      result.relatedEndNodes = relatedEndNodesArray;
    });

    const highlightedNodes = new Set(matchingNodeIds);
    const highlightedEndNodes = new Set(relatedEndNodesArray);

    set({
      searchResults: results,
      highlightedNodes,
      highlightedEndNodes,
      currentResultIndex: -1,
      focusedNodeId: null,
    });
  },
}));

export default useSearchStore;
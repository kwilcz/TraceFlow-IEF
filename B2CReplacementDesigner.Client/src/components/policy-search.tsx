import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { usePolicySearch } from '@hooks/use-policy-search';
import { cn } from '@/lib/utils';

interface PolicySearchProps {
  className?: string;
}

export interface PolicySearchRef {
  focus: () => void;
}

const PolicySearch = forwardRef<PolicySearchRef, PolicySearchProps>(({ className }, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { 
    searchTerm, 
    setSearchTerm, 
    searchResults, 
    currentResultIndex,
    navigateToNext,
    navigateToPrevious,
    clearSearch 
  } = usePolicySearch();

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    }
  }));

  const handleClear = () => {
    clearSearch();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Escape':
        handleClear();
        break;
      case 'ArrowDown':
        e.preventDefault();
        navigateToNext();
        break;
      case 'ArrowUp':
        e.preventDefault();
        navigateToPrevious();
        break;
      case 'Enter':
        e.preventDefault();
        if (searchResults.length > 0) {
          navigateToNext();
        }
        break;
    }
  };

  const matchCount = searchResults.length;
  const endNodeCount = new Set(
    searchResults.flatMap(result => result.relatedEndNodes)
  ).size;

  const hasResults = searchTerm && matchCount > 0;
  const showNavigation = hasResults && matchCount > 1;

  return (
    <div className={cn(`flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm`, className)}>
      <Search className="h-4 w-4 text-gray-500 flex-shrink-0" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search policy content..."
        value={searchTerm}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className="border-none outline-none bg-transparent text-sm min-w-0 flex-1 w-48"
      />
      
      {hasResults && (
        <div className="text-xs text-gray-500 whitespace-nowrap">
          {currentResultIndex >= 0 
            ? `${currentResultIndex + 1} of ${matchCount}` 
            : `${matchCount} matches`
          } • {endNodeCount} end nodes
        </div>
      )}
      
      {searchTerm && matchCount === 0 && (
        <div className="text-xs text-gray-500 whitespace-nowrap">
          No matches
        </div>
      )}

      {showNavigation && (
        <div className="flex gap-1">
          <button
            onClick={navigateToPrevious}
            className="p-1 hover:bg-gray-100 rounded"
            title="Previous result (↑)"
          >
            <ChevronUp className="h-3 w-3 text-gray-500" />
          </button>
          <button
            onClick={navigateToNext}
            className="p-1 hover:bg-gray-100 rounded"
            title="Next result (↓)"
          >
            <ChevronDown className="h-3 w-3 text-gray-500" />
          </button>
        </div>
      )}

      {searchTerm && (
        <button
          onClick={handleClear}
          className="p-1 hover:bg-gray-100 rounded"
          title="Clear search (Esc)"
        >
          <X className="h-3 w-3 text-gray-500" />
        </button>
      )}
    </div>
  );
});

PolicySearch.displayName = 'PolicySearch';

export default PolicySearch;

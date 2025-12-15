import React, { useRef, useEffect, forwardRef } from 'react';
import { X } from '@phosphor-icons/react';
import PolicySearch, { PolicySearchRef } from './policy-search';

interface FloatingPolicySearchProps {
  isVisible: boolean;
  onClose: () => void;
}

const FloatingPolicySearch = forwardRef<PolicySearchRef, FloatingPolicySearchProps>(({ isVisible, onClose }, ref) => {
  const searchRef = useRef<PolicySearchRef>(null);

  useEffect(() => {
    if (isVisible && searchRef.current) {
      // Focus the search input when the search becomes visible
      searchRef.current.focus();
    }
  }, [isVisible]);

  // Forward the ref to the parent
  React.useImperativeHandle(ref, () => ({
    focus: () => {
      searchRef.current?.focus();
    }
  }), []);

  if (!isVisible) return null;

  return (
    <div className="absolute top-4 right-4 z-50 flex items-center  bg-white border border-gray-300/10 rounded-lg p-3 shadow-sm">
      <PolicySearch ref={searchRef} className="border-none shadow-none p-0" />
      <button
        onClick={onClose}
        className="p-1 hover:bg-gray-100 rounded"
        title="Close search"
      >
        <X className="h-4 w-4 text-gray-500" />
      </button>
    </div>
  );
});

FloatingPolicySearch.displayName = 'FloatingPolicySearch';

export default FloatingPolicySearch;

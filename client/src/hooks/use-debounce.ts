import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for debouncing function calls
 * 
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns Debounced version of the callback function
 * 
 * @example
 * const debouncedSearch = useDebounce(() => {
 *   performSearch(searchTerm);
 * }, 500);
 */
export const useDebounce = <T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number = 300
): ((...args: Parameters<T>) => void) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
};

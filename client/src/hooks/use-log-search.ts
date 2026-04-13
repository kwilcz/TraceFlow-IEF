import { useState, useCallback, useMemo, useEffect, useRef } from 'react';

const EMPTY_SET = new Set<number>();

export interface LogSearchMatch {
  logIndex: number;
  lineIndex: number;
}

interface UseLogSearchOptions {
  /** All formatted JSON strings for each log, in order. */
  logJsons: string[];
  /** "all" = search every log tab; "current" = only the active tab */
  scope: 'all' | 'current';
  /** Index of the currently active log tab (needed when scope === "current") */
  currentLogIndex: number;
  /** When true, search is case-sensitive. Default: false */
  caseSensitive: boolean;
  /** When true, only match whole words (word-boundary aware). Default: false */
  wholeWord: boolean;
}

interface UseLogSearchReturn {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  matches: LogSearchMatch[];
  currentMatchIndex: number;
  currentMatch: LogSearchMatch | null;
  navigateToNext: () => void;
  navigateToPrevious: () => void;
  clearSearch: () => void;
  isVisible: boolean;
  show: () => void;
  hide: () => void;
  /** Returns the Set of line indices that have a match for a given log tab. */
  getMatchLinesForLog: (logIndex: number) => Set<number>;
  /** Call this when search becomes visible to set the "from cursor" anchor. */
  setAnchor: (logIndex: number, lineIndex: number) => void;
}

export function useLogSearch({ logJsons, scope, currentLogIndex, caseSensitive, wholeWord }: UseLogSearchOptions): UseLogSearchReturn {
  const [searchTerm, setSearchTerm] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const anchorRef = useRef<{ logIndex: number; lineIndex: number } | null>(null);

  const splitLogLines = useMemo(
    () => logJsons.map((json) => json.split('\n')),
    [logJsons]
  );

  const matches = useMemo<LogSearchMatch[]>(() => {
    if (!searchTerm.trim()) return [];
    const found: LogSearchMatch[] = [];
    const indices =
      scope === 'current' ? [currentLogIndex] : splitLogLines.map((_, i) => i);

    // Build matcher once — regex for whole-word, otherwise plain includes
    let lineMatches: (line: string) => boolean;
    if (wholeWord) {
      const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, caseSensitive ? '' : 'i');
      lineMatches = (line) => regex.test(line);
    } else if (caseSensitive) {
      lineMatches = (line) => line.includes(searchTerm);
    } else {
      const lower = searchTerm.toLowerCase();
      lineMatches = (line) => line.toLowerCase().includes(lower);
    }

    for (const logIndex of indices) {
      const lines = splitLogLines[logIndex];
      if (!lines) continue;
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        if (lineMatches(lines[lineIndex])) {
          found.push({ logIndex, lineIndex });
        }
      }
    }
    return found;
  }, [searchTerm, splitLogLines, scope, currentLogIndex, caseSensitive, wholeWord]);

  useEffect(() => {
    if (matches.length === 0) {
      setCurrentMatchIndex(-1);
      anchorRef.current = null;
      return;
    }
    const anchor = anchorRef.current;
    if (anchor) {
      anchorRef.current = null;
      const idx = matches.findIndex(
        (m) =>
          m.logIndex > anchor.logIndex ||
          (m.logIndex === anchor.logIndex && m.lineIndex >= anchor.lineIndex)
      );
      setCurrentMatchIndex(idx !== -1 ? idx : 0);
    } else {
      // Keep current position if still valid; clamp to end otherwise
      setCurrentMatchIndex((prev) =>
        prev < 0 ? 0 : Math.min(prev, matches.length - 1)
      );
    }
  }, [matches]);

  const navigateToNext= useCallback(() => {
    setCurrentMatchIndex((idx) => {
      if (matches.length === 0) return idx;
      return (idx + 1) % matches.length;
    });
  }, [matches.length]);

  const navigateToPrevious = useCallback(() => {
    setCurrentMatchIndex((idx) => {
      if (matches.length === 0) return idx;
      return (idx - 1 + matches.length) % matches.length;
    });
  }, [matches.length]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setCurrentMatchIndex(-1);
    anchorRef.current = null;
  }, []);

  const matchLinesByLog = useMemo(() => {
    const map = new Map<number, Set<number>>();
    for (const m of matches) {
      let set = map.get(m.logIndex);
      if (!set) {
        set = new Set<number>();
        map.set(m.logIndex, set);
      }
      set.add(m.lineIndex);
    }
    return map;
  }, [matches]);

  const getMatchLinesForLog = useCallback(
    (logIndex: number): Set<number> => {
      return matchLinesByLog.get(logIndex) ?? EMPTY_SET;
    },
    [matchLinesByLog]
  );

  const setAnchor = useCallback((logIndex: number, lineIndex: number) => {
    anchorRef.current = { logIndex, lineIndex };
  }, []);

  const currentMatch = currentMatchIndex >= 0 && currentMatchIndex < matches.length
    ? matches[currentMatchIndex]
    : null;

  return {
    searchTerm,
    setSearchTerm,
    matches,
    currentMatchIndex,
    currentMatch,
    navigateToNext,
    navigateToPrevious,
    clearSearch,
    isVisible,
    show: () => setIsVisible(true),
    hide: () => setIsVisible(false),
    getMatchLinesForLog,
    setAnchor,
  };
}

import React, { useRef, useImperativeHandle, forwardRef, useEffect, useContext, createContext } from "react";
import { XIcon, TreeViewIcon, CaretUpIcon, CaretDownIcon, MagnifyingGlassIcon, TextAaIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";

// ── Internal context ──────────────────────────────────────────────────────────

interface SearchRootContext {
    inputRef: React.RefObject<HTMLInputElement | null>;
}

const SearchRootCtx = createContext<SearchRootContext | null>(null);

const useSearchRootCtx = (): SearchRootContext => {
    const ctx = useContext(SearchRootCtx);
    if (!ctx) throw new Error("Must be used inside FloatingSearch");
    return ctx;
};

// ── Public ref type ───────────────────────────────────────────────────────────

interface FloatingSearchRef {
    focus: () => void;
    select: () => void;
}

// ── SearchRoot ────────────────────────────────────────────────────────────────

interface SearchRootProps {
    children: React.ReactNode;
    ariaLabel?: string;
}

const SearchRoot = forwardRef<FloatingSearchRef, SearchRootProps>(({ children, ariaLabel = "Search" }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
        focus: () => { inputRef.current?.focus(); },
        select: () => { inputRef.current?.select(); },
    }));

    // Focus and select-all on mount so user can immediately type to replace existing term
    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    // Restore focus to the previously focused element on unmount (WCAG 2.4.3)
    useEffect(() => {
        const previous = document.activeElement as HTMLElement;
        return () => { previous?.focus(); };
    }, []);

    return (
        <SearchRootCtx.Provider value={{ inputRef }}>
            <div
                role="search"
                aria-label={ariaLabel}
                className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-overlay border border-border rounded-lg p-1 shadow-overlay animate-in fade-in zoom-in-95 duration-150 motion-reduce:animate-none"
            >
                {children}
            </div>
        </SearchRootCtx.Provider>
    );
});

SearchRoot.displayName = "FloatingSearch";

// ── SearchInput ───────────────────────────────────────────────────────────────

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    onNavigateNext: () => void;
    onNavigatePrevious: () => void;
    onClose: () => void;
    placeholder?: string;
    inputAriaLabel?: string;
}

const SearchInput = ({ value, onChange, onNavigateNext, onNavigatePrevious, onClose, placeholder = "Search…", inputAriaLabel = "Search" }: SearchInputProps) => {
    const { inputRef } = useSearchRootCtx();
    const hintId = React.useId();

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        switch (e.key) {
            case "Escape":
                onClose();
                break;
            case "Enter":
            case "ArrowDown":
                e.preventDefault();
                onNavigateNext();
                break;
            case "ArrowUp":
                e.preventDefault();
                onNavigatePrevious();
                break;
        }
    };

    return (
        <>
            <span id={hintId} className="sr-only">
                Press Enter or Down Arrow for next match, Up Arrow for previous. Press Escape to close.
            </span>
            <MagnifyingGlassIcon aria-hidden="true" className="size-4 ml-1 text-muted-foreground shrink-0" />
            <Input
                ref={inputRef}
                type="text"
                variant="ghost"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label={inputAriaLabel}
                aria-describedby={hintId}
                className="px-2 py-1 text-xs w-48 min-w-0 flex-1 rounded-lg"
            />
        </>
    );
};

// ── SearchResults ─────────────────────────────────────────────────────────────

interface SearchResultsProps {
    searchTerm: string;
    matchCount: number;
    currentMatchIndex: number;
    onNavigateNext: () => void;
    onNavigatePrevious: () => void;
}

const SearchResults = ({ searchTerm, matchCount, currentMatchIndex, onNavigateNext, onNavigatePrevious }: SearchResultsProps) => {
    const hasResults = searchTerm.length > 0 && matchCount > 0;
    const showNavigation = hasResults && matchCount > 1;

    return (
        <>
            {/* Fixed-width status — always rendered, no layout shift */}
            <div className="text-xs whitespace-nowrap w-20 text-right tabular-nums">
                {hasResults ? (
                    <span className="text-muted-foreground">
                        {currentMatchIndex >= 0
                            ? `${currentMatchIndex + 1} of ${matchCount}`
                            : `${matchCount} match${matchCount === 1 ? "" : "es"}`}
                    </span>
                ) : (
                    <span className="text-muted-foreground/40">No matches</span>
                )}
            </div>

            {/* Screen reader live region */}
            <span className="sr-only" aria-live="polite" aria-atomic="true">
                {searchTerm && matchCount === 0
                    ? "No matches"
                    : hasResults
                    ? `Match ${currentMatchIndex + 1} of ${matchCount}`
                    : ""}
            </span>

            {/* Navigation buttons — always rendered, disabled when not applicable */}
            <div className="flex gap-1">
                <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={onNavigatePrevious}
                    aria-label="Previous match"
                    disabled={!showNavigation}
                    className="rounded-lg"
                >
                    <CaretUpIcon aria-hidden="true" />
                </Button>
                <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={onNavigateNext}
                    aria-label="Next match"
                    disabled={!showNavigation}
                    className="rounded-lg"
                >
                    <CaretDownIcon aria-hidden="true" />
                </Button>
            </div>
        </>
    );
};

// ── SearchSeparator ───────────────────────────────────────────────────────────

const SearchSeparator = () => <Separator orientation="vertical" className="self-stretch" />;

// ── SearchFilters (container) ─────────────────────────────────────────────────

interface SearchFiltersProps {
    children: React.ReactNode;
}

const SearchFilters = ({ children }: SearchFiltersProps) => (
    <div className="flex items-center gap-1">{children}</div>
);

// ── SearchFilterNested ────────────────────────────────────────────────────────

interface SearchFilterNestedProps {
    scope: "all" | "current";
    onScopeChange: (scope: "all" | "current") => void;
}

const SearchFilterNested = ({ scope, onScopeChange }: SearchFilterNestedProps) => (
    <Toggle
        size="icon-xs"
        pressed={scope === "all"}
        onPressedChange={(pressed: boolean) => onScopeChange(pressed ? "all" : "current")}
        aria-label={
            scope === "all"
                ? "Search all sections — click to search current only"
                : "Search current section — click to search all sections"
        }
        className="rounded-lg"
    >
        <TreeViewIcon aria-hidden="true" />
    </Toggle>
);

// ── SearchFilterCaseSensitive ─────────────────────────────────────────────────

interface SearchFilterCaseSensitiveProps {
    value: boolean;
    onChange: (v: boolean) => void;
}

const SearchFilterCaseSensitive = ({ value, onChange }: SearchFilterCaseSensitiveProps) => (
    <Toggle
        size="icon-xs"
        pressed={value}
        onPressedChange={onChange}
        aria-label={
            value
                ? "Case sensitive — click to ignore case"
                : "Case insensitive — click to match case"
        }
        className="rounded-lg"
    >
        <TextAaIcon aria-hidden="true" />
    </Toggle>
);

// ── SearchFilterWholeWord ─────────────────────────────────────────────────────

interface SearchFilterWholeWordProps {
    value: boolean;
    onChange: (v: boolean) => void;
}

const SearchFilterWholeWord = ({ value, onChange }: SearchFilterWholeWordProps) => (
    <Toggle
        size="icon-xs"
        pressed={value}
        onPressedChange={onChange}
        aria-label={
            value
                ? "Whole word — click to match partial words"
                : "Partial match — click to match whole words only"
        }
        className="font-mono text-[11px] rounded-lg"
    >
        <span className="underline underline-offset-2 leading-none">W</span>
    </Toggle>
);

// ── SearchClose ───────────────────────────────────────────────────────────────

interface SearchCloseProps {
    onClose: () => void;
}

const SearchClose = ({ onClose }: SearchCloseProps) => (
    <Button size="icon-xs" variant="ghost" onClick={onClose} aria-label="Close search" className="rounded-lg">
        <XIcon aria-hidden="true" />
    </Button>
);

// ── Compound component assembly ───────────────────────────────────────────────

export const FloatingSearch = Object.assign(SearchRoot, {
    Input: SearchInput,
    Results: SearchResults,
    Separator: SearchSeparator,
    Filters: Object.assign(SearchFilters, {
        Nested: SearchFilterNested,
        CaseSensitive: SearchFilterCaseSensitive,
        WholeWord: SearchFilterWholeWord,
    }),
    Close: SearchClose,
});

export default FloatingSearch;
export type { FloatingSearchRef };

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Highlight, themes } from "prism-react-renderer";
import { useTheme } from "@/components/theme-provider";

// ============================================================================
// Raw Log Code — virtualized syntax-highlighted JSON with line numbers
// ============================================================================

const LINE_HEIGHT = 20; // px — matches text-xs font-mono leading
const OVERSCAN = 15; // extra lines above/below viewport


interface RawLogCodeProps {
    /** Pre-formatted JSON string to render. */
    code: string;
    /** Lines that contain a search match — get a faint highlight background */
    highlightLines?: Set<number>;
    /** The active/focused match line — brighter highlight + auto-scroll to this line */
    focusedLine?: number | null;
    /** Fires when the user scrolls, with the first visible line index */
    onScrollLineChange?: (firstVisibleLine: number) => void;
}

/** Computes the visible window start/end indices for a virtualized list. */
function computeVirtualWindow(totalLines: number, scrollTop: number, viewHeight: number) {
    const start = Math.max(0, Math.floor(scrollTop / LINE_HEIGHT) - OVERSCAN);
    const end = Math.min(totalLines, Math.ceil((scrollTop + viewHeight) / LINE_HEIGHT) + OVERSCAN);
    return { start, end };
}

/**
 * Renders JSON with `prism-react-renderer` syntax highlighting and line numbers.
 *
 * Uses DIY virtualization — only visible lines are rendered to the DOM,
 * while the full token list is computed once by `Highlight` and cached by `memo`.
 * A `ResizeObserver` tracks the container height and a scroll handler drives
 * the visible window.
 *
 * Theme-aware — uses `useTheme()` to pick the matching VS Code prism theme.
 * Memoized — only re-renders when `code` changes.
 * Scrollbar styled with `scrollbar-width: thin` + `scrollbar-color` for consistency.
 */
export const RawLogCode = memo(function RawLogCode({ code, highlightLines, focusedLine, onScrollLineChange }: RawLogCodeProps) {
    const { resolvedTheme } = useTheme();
    const prismTheme = resolvedTheme === "dark" ? themes.vsDark : themes.vsLight;

    const containerRef = useRef<HTMLDivElement>(null);
    const scrollTopRef = useRef(0);
    const totalLinesRef = useRef(0);
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });

    const [viewHeight, setViewHeight] = useState(600);
    const viewHeightRef = useRef(viewHeight);
    useLayoutEffect(() => { viewHeightRef.current = viewHeight; }, [viewHeight]);

    const updateRange = useCallback((totalLines: number) => {
        const st = scrollTopRef.current;
        const vh = viewHeightRef.current;
        const { start, end } = computeVirtualWindow(totalLines, st, vh);
        setVisibleRange(prev => (prev.start === start && prev.end === end ? prev : { start, end }));
    }, []);

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        scrollTopRef.current = e.currentTarget.scrollTop;
        onScrollLineChange?.(Math.floor(scrollTopRef.current / LINE_HEIGHT));
        updateRange(totalLinesRef.current);
    }, [onScrollLineChange, updateRange]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([entry]) => {
            const h = entry.contentRect.height;
            viewHeightRef.current = h;
            setViewHeight(h);
            updateRange(totalLinesRef.current);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, [updateRange]);

    useEffect(() => {
        if (focusedLine == null || !containerRef.current) return;
        const targetScrollTop = Math.max(0, focusedLine * LINE_HEIGHT - viewHeightRef.current / 2);
        containerRef.current.scrollTop = targetScrollTop;
        scrollTopRef.current = targetScrollTop;
        updateRange(totalLinesRef.current);
    }, [focusedLine, updateRange]);

    return (
        <Highlight code={code} language="json" theme={prismTheme}>
            {({ tokens, getLineProps, getTokenProps }) => {
                totalLinesRef.current = tokens.length;
                const totalHeight = tokens.length * LINE_HEIGHT;
                const { start: startIdx, end: endIdx } = visibleRange;
                const visibleTokens = tokens.slice(startIdx, endIdx);

                return (
                    <div
                        ref={containerRef}
                        onScroll={handleScroll}
                        tabIndex={0}
                        aria-label="JSON log viewer"
                        className="h-full overflow-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 bg-surface"
                        style={{
                            color: prismTheme.plain.color,
                            scrollbarWidth: "thin",
                            scrollbarColor: `var(--color-border) transparent`,
                        }}
                    >
                        <pre
                            className="text-xs font-mono px-1 py-2 m-0"
                            style={{ height: totalHeight, position: "relative" }}
                        >
                            <div
                                style={{
                                    position: "absolute",
                                    top: startIdx * LINE_HEIGHT,
                                    left: 0,
                                    right: 0,
                                }}
                            >
                                {visibleTokens.map((line, localIdx) => {
                                    const globalIdx = startIdx + localIdx;
                                    const { className: prismClassName, ...lineProps } = getLineProps({ line });
                                    return (
                                        <div
                                            key={globalIdx}
                                            {...lineProps}
                                            className={[
                                                prismClassName ?? "",
                                                "flex",
                                                globalIdx === focusedLine
                                                    ? "bg-search-match-focused ring-1 ring-inset ring-search-match-ring"
                                                    : highlightLines?.has(globalIdx)
                                                    ? "bg-search-match"
                                                    : "",
                                            ]
                                                .filter(Boolean)
                                                .join(" ")}
                                        >
                                            <span className="flex-none select-none pr-4 text-right text-muted-foreground/50 w-12">
                                                {globalIdx + 1}
                                            </span>
                                            <span className="truncate whitespace-pre-wrap break-words">
                                                {line.map((token, key) => (
                                                    <span key={key} {...getTokenProps({ token })} />
                                                ))}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </pre>
                    </div>
                );
            }}
        </Highlight>
    );
});

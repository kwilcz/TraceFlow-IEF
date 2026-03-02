import { memo, useCallback, useEffect, useRef, useState } from "react";
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
export const RawLogCode = memo(function RawLogCode({ code }: RawLogCodeProps) {
    const { resolvedTheme } = useTheme();
    const prismTheme = resolvedTheme === "dark" ? themes.vsDark : themes.vsLight;

    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewHeight, setViewHeight] = useState(600);

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    }, []);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([entry]) => {
            setViewHeight(entry.contentRect.height);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    return (
        <Highlight code={code} language="json" theme={prismTheme}>
            {({ tokens, getLineProps, getTokenProps }) => {
                const totalLines = tokens.length;
                const totalHeight = totalLines * LINE_HEIGHT;
                const startIdx = Math.max(0, Math.floor(scrollTop / LINE_HEIGHT) - OVERSCAN);
                const endIdx = Math.min(totalLines, Math.ceil((scrollTop + viewHeight) / LINE_HEIGHT) + OVERSCAN);
                const visibleTokens = tokens.slice(startIdx, endIdx);

                return (
                    <div
                        ref={containerRef}
                        onScroll={handleScroll}
                        tabIndex={0}
                        className="h-full overflow-auto outline-none bg-surface"
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
                                    return (
                                        <div key={globalIdx} {...getLineProps({ line })} className="flex">
                                            <span className="flex-none select-none pr-4 text-right text-muted-foreground/50 w-12">
                                                {globalIdx + 1}
                                            </span>
                                            <span className="truncate whitespace-pre-wrap wrap-break-word-wrap wrap-break-word">
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

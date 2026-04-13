import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
// NOTE: useEffect kept for View Source navigation (cross-component coordination via context)
import { CopyIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useLogStore } from "@/stores/log-store";
import { getLogsForFlow } from "@/lib/trace";
import { formatJsonPayload } from "@/lib/formatters/json-formatters";
import { useDebuggerContext } from "../debugger-context";
import { RawLogCode } from "./raw-log-code";
import { useLogSearch } from "@hooks/use-log-search";
import FloatingSearch, { type FloatingSearchRef } from "@/components/ui/floating-search";
import type { LogRecord } from "@/types/logs";

// ============================================================================
// Raw Log Viewer — full JSON viewer for flow log records
// ============================================================================

/** Extract the event instance (e.g. "Event:AUTH") from the log's Headers clip. */
function getEventInstance(log: LogRecord): string {
    const headers = log.clips.find((c) => c.Kind === "Headers");
    if (!headers) return "";
    const content = headers.Content as { EventInstance?: string };
    return content.EventInstance ?? "";
}

/**
 * Displays the raw JSON contents of all `LogRecord`s in the selected flow.
 *
 * Features:
 * - Nested tab bar when the flow contains multiple log records
 * - Syntax-highlighted JSON with line numbers (via `RawLogCode`)
 * - Copy JSON button in a compact toolbar
 * - Auto-navigation via `targetLogId` from the debugger context ("View Source" flow)
 *
 * Only the active log page is rendered (unmounted tabs have no content).
 */
export function RawLogViewer() {
    const { targetLogId, setTargetLogId } = useDebuggerContext();

    const logs = useLogStore((s) => s.logs);
    const selectedFlowId = useLogStore((s) => s.selectedFlow?.id);
    const userFlows = useLogStore((s) => s.userFlows);

    // ── Derive flow logs ────────────────────────────────────────────────
    const flowLogs = useMemo(() => {
        if (!selectedFlowId) return [];
        return getLogsForFlow(logs, selectedFlowId, userFlows);
    }, [logs, selectedFlowId, userFlows]);

    // ── Active log index ────────────────────────────────────────────────
    // Reset when flow changes is handled by key={selectedFlowId} on <RawLogViewer>
    const [activeLogIndex, setActiveLogIndex] = useState(0);
    const [searchScope, setSearchScope] = useState<'all' | 'current'>('all');
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [wholeWord, setWholeWord] = useState(false);

    // ── "View Source" auto-navigation ───────────────────────────────────
    useEffect(() => {
        if (!targetLogId || flowLogs.length === 0) return;

        const idx = flowLogs.findIndex((log) => log.id === targetLogId);
        if (idx >= 0) {
            setActiveLogIndex(idx);
        }
        setTargetLogId(null);
    }, [targetLogId, flowLogs, setTargetLogId]);

    // ── Per-logId JSON format cache ──────────────────────────────────────
    // Cache is fresh on mount; component remounts on flow change via key={selectedFlowId}
    const jsonCacheRef = useRef(new Map<string, string>());

    const allLogJsons = useMemo(() => {
        return flowLogs.map((log) => {
            return jsonCacheRef.current.get(log.id) ?? formatJsonPayload(log.parsedPayload);
        });
    }, [flowLogs]);

    useLayoutEffect(() => {
        flowLogs.forEach((log, idx) => {
            if (!jsonCacheRef.current.has(log.id)) {
                jsonCacheRef.current.set(log.id, allLogJsons[idx]);
            }
        });
    }, [flowLogs, allLogJsons]);

    const formattedJson = allLogJsons[activeLogIndex] ?? "";

    // ── Line count for footer ────────────────────────────────────────────
    const lineCount = useMemo(
        () => (formattedJson.match(/\n/g)?.length ?? 0) + 1,
        [formattedJson]
    );

    // ── Copy handler ────────────────────────────────────────────────────
    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(formattedJson).then(
            () => toast.success("JSON copied to clipboard"),
            () => toast.error("Failed to copy JSON"),
        );
    }, [formattedJson]);

    // ── Search setup ─────────────────────────────────────────────────────
    const search = useLogSearch({ logJsons: allLogJsons, scope: searchScope, currentLogIndex: activeLogIndex, caseSensitive, wholeWord });
    const containerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<FloatingSearchRef>(null);

    // Track current scroll line per active tab (for "from cursor")
    const scrollLineRef = useRef(0);
    const handleScrollLineChange = useCallback((line: number) => {
        scrollLineRef.current = line;
    }, []);

    // CTRL+F keyboard handler — stable ref pattern avoids re-registration on search object change
    const searchStateRef = useRef(search);
    useEffect(() => { searchStateRef.current = search; });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const s = searchStateRef.current;
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                if (!containerRef.current?.contains(document.activeElement)) return;
                e.preventDefault();
                s.setAnchor(activeLogIndex, scrollLineRef.current);
                const wasAlreadyVisible = s.isVisible;
                s.show();
                const selection = window.getSelection()?.toString().trim();
                if (selection) {
                    s.setSearchTerm(selection);
                }
                // If already visible (re-press CTRL+F), component won't remount — focus+select manually
                if (wasAlreadyVisible) {
                    searchRef.current?.focus();
                    searchRef.current?.select();
                }
                // Otherwise: FloatingSearch mount useEffect handles focus+select
            }
            if (e.key === 'Escape' && s.isVisible) s.hide();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [activeLogIndex]); // only re-register when activeLogIndex changes

    // Auto-switch tabs when active match is in a different log
    useEffect(() => {
        if (search.currentMatch && search.currentMatch.logIndex !== activeLogIndex) {
            setActiveLogIndex(search.currentMatch.logIndex);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search.currentMatch]); // intentionally omit activeLogIndex — auto-switch only on match navigation, not manual tab switch

    // ── Highlight props for RawLogCode ───────────────────────────────────
    const { isVisible: searchIsVisible, getMatchLinesForLog, currentMatch: searchCurrentMatch } = search;
    const highlightLines = useMemo(
        () => (searchIsVisible ? getMatchLinesForLog(activeLogIndex) : undefined),
        [searchIsVisible, getMatchLinesForLog, activeLogIndex]
    );
    const focusedLine = useMemo(
        () =>
            searchIsVisible && searchCurrentMatch?.logIndex === activeLogIndex
                ? searchCurrentMatch.lineIndex
                : null,
        [searchIsVisible, searchCurrentMatch, activeLogIndex]
    );

    // ── Empty state ─────────────────────────────────────────────────────
    if (!selectedFlowId || flowLogs.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No flow selected
            </div>
        );
    }

    return (
        <div ref={containerRef} className="h-full flex flex-col min-h-0">
        <Tabs
            value={String(activeLogIndex)}
            onValueChange={(v) => setActiveLogIndex(Number(v))}
            className="flex flex-col h-full overflow-hidden min-h-0 gap-0"
        >
            {/* ── Header: Log tab bar (flat variant) ─────────────────────── */}
            <TabsList variant="flat" className="shrink-0 text-xs">
                {flowLogs.map((log, idx) => {
                    const event = getEventInstance(log);
                    return (
                        <TabsTrigger
                            key={log.id}
                            value={String(idx)}
                            className="text-xs px-3 py-1 whitespace-nowrap"
                        >
                            Log {idx + 1}{event ? `: ${event}` : ""}
                        </TabsTrigger>
                    );
                })}
            </TabsList>

            {/* ── Scrollable JSON content ───────────────────────────────────── */}
            <TabsContent
                key={activeLogIndex}
                value={String(activeLogIndex)}
                className="relative flex-1 min-h-0"
            >
                <RawLogCode
                    code={formattedJson}
                    highlightLines={highlightLines}
                    focusedLine={focusedLine}
                    onScrollLineChange={handleScrollLineChange}
                />
                {search.isVisible && (
                    <FloatingSearch ref={searchRef}>
                        <FloatingSearch.Input
                            value={search.searchTerm}
                            onChange={search.setSearchTerm}
                            onNavigateNext={search.navigateToNext}
                            onNavigatePrevious={search.navigateToPrevious}
                            onClose={search.hide}
                        />
                        <FloatingSearch.Separator />
                        <FloatingSearch.Results
                            searchTerm={search.searchTerm}
                            matchCount={search.matches.length}
                            currentMatchIndex={search.currentMatchIndex}
                            onNavigateNext={search.navigateToNext}
                            onNavigatePrevious={search.navigateToPrevious}
                        />
                        <FloatingSearch.Separator />
                        <FloatingSearch.Filters>
                            <FloatingSearch.Filters.Nested scope={searchScope} onScopeChange={setSearchScope} />
                            <FloatingSearch.Filters.CaseSensitive value={caseSensitive} onChange={setCaseSensitive} />
                            <FloatingSearch.Filters.WholeWord value={wholeWord} onChange={setWholeWord} />
                        </FloatingSearch.Filters>
                        <FloatingSearch.Close onClose={search.hide} />
                    </FloatingSearch>
                )}
                <Button
                    onClick={handleCopy}
                    size="icon-md"
                    variant="tertiary"
                    className="absolute top-2 right-4 z-10 p-1.5"
                    title="Copy JSON to clipboard"
                >
                    <CopyIcon />
                </Button>
            </TabsContent>

            {/* ── Footer ───────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-3 py-1 border-t border-border text-[10px] text-muted-foreground shrink-0">
                <span>{lineCount.toLocaleString()} lines</span>
                <span>Log {activeLogIndex + 1}/{flowLogs.length}</span>
            </div>
        </Tabs>
        </div>
    );
}

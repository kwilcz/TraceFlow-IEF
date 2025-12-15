"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLogAnalyzerContext } from "@/contexts/log-analyzer-context";
import { createDetailedDateFormatter } from "@/lib/formatters/date-formatters";
import { formatJsonPayload } from "@/lib/formatters/json-formatters";
import type { LogRecord } from "@/types/logs";
import { CaretLeft, CaretRight, Copy, Database, FileText } from "@phosphor-icons/react";
import { useMemo } from "react";
import { toast } from "sonner";
import { Highlight } from "prism-react-renderer";
import type { Token } from "prism-react-renderer";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type GetTokenProps = (input: { token: Token; key?: string | number }) => HTMLAttributes<HTMLElement>;
import { Tooltip, TooltipTrigger } from "../ui/tooltip";
import { TooltipContent } from "@radix-ui/react-tooltip";

interface DetailViewerHeaderProps {
    selectedLog: LogRecord | null;
    flowLogs: LogRecord[];
    currentIndex: number;
}

const DetailViewerHeader = ({ selectedLog, flowLogs, currentIndex }: DetailViewerHeaderProps) => (
    <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle>Log Details</CardTitle>
                <CardDescription>
                    {selectedLog 
                        ? `Log ${currentIndex + 1} of ${flowLogs.length} in this flow` 
                        : "Select a flow to view its log entries."}
                </CardDescription>
            </div>
            {flowLogs.length > 0 && (
                <Badge variant="outline">
                    <FileText className="h-3 w-3 mr-1" />
                    {flowLogs.length} log{flowLogs.length !== 1 ? "s" : ""}
                </Badge>
            )}
        </div>
    </CardHeader>
);

interface FlowLogNavigatorProps {
    flowLogs: LogRecord[];
    selectedLog: LogRecord | null;
    onSelectLog: (log: LogRecord) => void;
    formatter: Intl.DateTimeFormat;
}

const FlowLogNavigator = ({ flowLogs, selectedLog, onSelectLog, formatter }: FlowLogNavigatorProps) => {
    const currentIndex = useMemo(() => {
        if (!selectedLog) return -1;
        return flowLogs.findIndex(log => log.id === selectedLog.id);
    }, [flowLogs, selectedLog]);

    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < flowLogs.length - 1;

    const goToPrev = () => {
        if (hasPrev) {
            onSelectLog(flowLogs[currentIndex - 1]);
        }
    };

    const goToNext = () => {
        if (hasNext) {
            onSelectLog(flowLogs[currentIndex + 1]);
        }
    };

    if (flowLogs.length === 0) return null;

    return (
        <div className="flex flex-col gap-2 mb-4">
            <div className="flex items-center justify-between gap-2">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={goToPrev} 
                    disabled={!hasPrev}
                    className="gap-1"
                >
                    <CaretLeft className="h-4 w-4" />
                    Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                    {currentIndex + 1} / {flowLogs.length}
                </span>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={goToNext} 
                    disabled={!hasNext}
                    className="gap-1"
                >
                    Next
                    <CaretRight className="h-4 w-4" />
                </Button>
            </div>
            <ScrollArea className="w-full">
                <div className="flex gap-1 pb-2">
                    {flowLogs.map((log, idx) => (
                        <Button
                            key={log.id}
                            variant={selectedLog?.id === log.id ? "default" : "outline"}
                            size="sm"
                            className={cn(
                                "h-7 text-xs shrink-0",
                                selectedLog?.id === log.id && "ring-2 ring-primary"
                            )}
                            onClick={() => onSelectLog(log)}
                        >
                            {idx + 1}
                        </Button>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};

interface LogMetadataBadgesProps {
    log: LogRecord;
    formatter: Intl.DateTimeFormat;
    onCopy: () => Promise<void>;
}

const LogMetadataHeader = ({ log, formatter, onCopy }: LogMetadataBadgesProps) => (
    <div className="flex justify-around items-center text-md text-muted-foreground bg-muted w-full p-4 gap-4 rounded-t-lg border">
        <div className="flex flex-1 flex-wrap gap-4 justify-between">
            <span>
                <p className="text-primary">CorrelationId</p>
                <p className="font-mono">{log.correlationId}</p>
            </span>
            <span>
                <p className="text-primary">Policy ID</p>
                <p className="font-mono">{log.policyId}</p>
            </span>
            {log.cloudRoleInstance && (
                <span>
                    <p className="text-primary">Cloud Role Instance</p>
                    <p className="font-mono flex items-center gap-1">
                        <Database className="h-4 w-4" /> {log.cloudRoleInstance}
                    </p>
                </span>
            )}
            <span>
                <p className="text-primary">Timestamp</p>
                <p className="font-mono">{formatter.format(log.timestamp)}</p>
            </span>
        </div>

        <Tooltip>
            <TooltipTrigger>
                <Button variant="outline" size="icon" aria-label="Copy JSON" onClick={onCopy}>
                    <Copy className="h-4 w-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent>Copy JSON to clipboard</TooltipContent>
        </Tooltip>
    </div>
);

const useClipboard = () => {
    const copyToClipboard = async (content: string): Promise<boolean> => {
        if (!navigator?.clipboard) {
            toast.error("Clipboard API is not available in this browser.");
            return false;
        }

        try {
            await navigator.clipboard.writeText(content);
            toast.success("JSON copied to clipboard");
            return true;
        } catch {
            toast.error("Failed to copy to clipboard");
            return false;
        }
    };

    return { copyToClipboard };
};

const LineNumber = ({ number }: { number: number }) => (
    <span className="flex-none select-none pr-4 text-right text-slate-600 w-10">
        {number}
    </span>
);

const LineContent = ({
    line,
    getTokenProps,
}: {
    line: Token[];
    getTokenProps: GetTokenProps;
}) => (
    <span className="truncate whitespace-pre-wrap break-words">
        {line.map((token, key) => (
            <span key={key} {...getTokenProps({ token })} />
        ))}
    </span>
);

const JsonCodeViewer = ({ payload }: { payload: string }) => (
    <Highlight code={payload} language="json">
        {({ className, tokens, getLineProps, getTokenProps }) => (
            <pre
                className={`rounded-md border -mt-1 bg-slate-950 px-1 py-4 text-xs font-mono text-slate-50 ${className}`}
            >
                {tokens.map((line, i) => (
                    <div key={i} {...getLineProps({ line })} className="flex">
                        <LineNumber number={i + 1} />
                        <LineContent line={line} getTokenProps={getTokenProps} />
                    </div>
                ))}
            </pre>
        )}
    </Highlight>
);

export const LogDetailViewer = () => {
    const { selectedLog, flowLogs, setSelectedLog } = useLogAnalyzerContext();
    const { copyToClipboard } = useClipboard();

    const payload = useMemo(
        () => formatJsonPayload(selectedLog?.parsedPayload ?? selectedLog?.payloadText ?? ""),
        [selectedLog]
    );

    const dateFormatter = useMemo(() => createDetailedDateFormatter(), []);

    const currentIndex = useMemo(() => {
        if (!selectedLog) return -1;
        return flowLogs.findIndex(log => log.id === selectedLog.id);
    }, [flowLogs, selectedLog]);

    const handleCopy = async () => {
        if (selectedLog) {
            await copyToClipboard(payload);
        }
    };

    return (
        <Card className="h-full">
            <DetailViewerHeader 
                selectedLog={selectedLog} 
                flowLogs={flowLogs}
                currentIndex={currentIndex}
            />
            <CardContent>
                <FlowLogNavigator 
                    flowLogs={flowLogs}
                    selectedLog={selectedLog}
                    onSelectLog={setSelectedLog}
                    formatter={dateFormatter}
                />
                {selectedLog && <LogMetadataHeader log={selectedLog} formatter={dateFormatter} onCopy={handleCopy} />}
                <JsonCodeViewer payload={payload} />
            </CardContent>
        </Card>
    );
};

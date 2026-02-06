"use client";

import React, { useMemo, type ChangeEvent, useState } from "react";
import { Warning as AlertCircle, CheckCircle as CheckCircle2, Clock, Funnel as Filter, SpinnerGap as Loader2, Graph as Network, XCircle } from "@phosphor-icons/react";
import { useLogAnalyzerContext } from "@/contexts/log-analyzer-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { createDateFormatter } from "@/lib/formatters/date-formatters";
import type { UserFlow } from "@/types/trace";

interface FlowTableFilters {
    correlationId: string;
    policyId: string;
}

const useFlowFiltering = (flows: UserFlow[], filters: FlowTableFilters) => {
    return useMemo(() => {
        return flows.filter((flow) => {
            const matchesCorrelation = flow.correlationId.toLowerCase().includes(filters.correlationId.toLowerCase());
            const matchesPolicy = flow.policyId.toLowerCase().includes(filters.policyId.toLowerCase());
            return matchesCorrelation && matchesPolicy;
        });
    }, [flows, filters.correlationId, filters.policyId]);
};

const useFlowGrouping = (flows: UserFlow[]) => {
    return useMemo(() => {
        const groups = new Map<string, UserFlow[]>();
        flows.forEach((flow) => {
            const key = flow.policyId || "Unknown";
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(flow);
        });
        return Array.from(groups.entries());
    }, [flows]);
};

interface FilterInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    icon: React.ComponentType<{ className?: string }>;
}

const FilterInput = ({ value, onChange, placeholder, icon: Icon }: FilterInputProps) => (
    <div className="relative">
        <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
            placeholder={placeholder}
            value={value}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
            className="pl-10"
        />
    </div>
);

interface FlowTableRowProps {
    flow: UserFlow;
    isSelected: boolean;
    onClick: (flow: UserFlow) => void;
    formatter: Intl.DateTimeFormat;
}

const FlowTableRow = ({ flow, isSelected, onClick, formatter }: FlowTableRowProps) => {
    const statusIcon = flow.hasErrors ? (
        <AlertCircle className="h-3.5 w-3.5 text-destructive" />
    ) : flow.cancelled ? (
        <XCircle className="h-3.5 w-3.5 text-orange-500" />
    ) : flow.completed ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
    ) : (
        <Clock className="h-3.5 w-3.5 text-yellow-500" />
    );

    const statusText = flow.hasErrors ? "Error" : flow.cancelled ? "Cancelled" : flow.completed ? "Completed" : "In Progress";

    return (
        <TableRow
            onClick={() => onClick(flow)}
            className={cn(
                "cursor-pointer hover:bg-muted/40 transition-colors",
                isSelected && "bg-primary/5 border-l-2 border-l-primary"
            )}
        >
            <TableCell className="font-mono text-xs max-w-[150px]" title={flow.correlationId}>
                <span className="block truncate">{flow.correlationId}</span>
            </TableCell>
            <TableCell className="text-xs">
                <div className="flex items-center gap-1.5">
                    {statusIcon}
                    <span className={cn(
                        flow.hasErrors && "text-destructive",
                        flow.cancelled && !flow.hasErrors && "text-orange-600",
                        flow.completed && !flow.hasErrors && !flow.cancelled && "text-green-600",
                        !flow.completed && !flow.hasErrors && !flow.cancelled && "text-yellow-600"
                    )}>
                        {statusText}
                    </span>
                </div>
            </TableCell>
            <TableCell className="text-xs text-center">
                {flow.stepCount}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
                {formatter.format(flow.startTime)}
            </TableCell>
        </TableRow>
    );
};

interface FlowGroupHeaderProps {
    policyId: string;
    flowCount: number;
}

const FlowGroupHeader = ({ policyId, flowCount }: FlowGroupHeaderProps) => (
    <TableRow className="bg-muted/60">
        <TableCell colSpan={4} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <div className="flex items-center justify-between">
                <span>{policyId}</span>
                <Badge variant="outline" className="text-[10px]">{flowCount} flow{flowCount !== 1 ? "s" : ""}</Badge>
            </div>
        </TableCell>
    </TableRow>
);

export const LogTableResults = () => {
    const { userFlows, selectedFlow, selectFlow, isLoading, logs } = useLogAnalyzerContext();
    const [correlationFilter, setCorrelationFilter] = useState("");
    const [policyFilter, setPolicyFilter] = useState("");

    const filteredFlows = useFlowFiltering(userFlows, {
        correlationId: correlationFilter,
        policyId: policyFilter,
    });
    const groupedFlows = useFlowGrouping(filteredFlows);
    const dateFormatter = useMemo(() => createDateFormatter(), []);

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading telemetry
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2 rounded-md border border-dashed py-10 text-sm text-muted-foreground">
                <p>No logs loaded yet. Run a query to see results.</p>
            </div>
        );
    }

    if (userFlows.length === 0) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2 rounded-md border border-dashed py-10 text-sm text-muted-foreground">
                <p>No user flows found in the loaded logs.</p>
            </div>
        );
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <CardTitle>User Flows</CardTitle>
                        <CardDescription>User journey executions grouped by flow instance.</CardDescription>
                    </div>
                    <Badge variant="outline">{filteredFlows.length} flow{filteredFlows.length !== 1 ? "s" : ""}</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    <FilterInput
                        value={correlationFilter}
                        onChange={setCorrelationFilter}
                        placeholder="Filter by correlation ID"
                        icon={Filter}
                    />
                    <FilterInput
                        value={policyFilter}
                        onChange={setPolicyFilter}
                        placeholder="Filter by policy ID"
                        icon={Network}
                    />
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
                <div className="rounded-md border">
                    <ScrollArea className="w-full h-[450px]">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background z-10">
                                <TableRow>
                                    <TableHead className="w-[150px]">Correlation ID</TableHead>
                                    <TableHead className="w-[100px]">Status</TableHead>
                                    <TableHead className="w-[60px] text-center">Steps</TableHead>
                                    <TableHead className="w-[150px]">Started</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {groupedFlows.map(([policyId, flows]) => (
                                    <React.Fragment key={policyId}>
                                        <FlowGroupHeader policyId={policyId} flowCount={flows.length} />
                                        {flows.map((flow) => (
                                            <FlowTableRow
                                                key={flow.id}
                                                flow={flow}
                                                isSelected={selectedFlow?.id === flow.id}
                                                onClick={selectFlow}
                                                formatter={dateFormatter}
                                            />
                                        ))}
                                    </React.Fragment>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
            </CardContent>
        </Card>
    );
};

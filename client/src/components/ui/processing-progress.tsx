"use client";

import React from "react";
import { SpinnerGap } from "@phosphor-icons/react";
import { Progress } from "@/components/ui/progress";

export type ProcessingStatus = "idle" | "uploading" | "processing" | "parsing" | "complete" | "error";

interface ProcessingProgressProps {
    isActive: boolean;
    status: ProcessingStatus | string;
    progress: number;
    statusLabels?: Partial<Record<string, string>>;
    className?: string;
}

const defaultStatusLabels: Record<string, string> = {
    idle: "",
    uploading: "Processing files...",
    processing: "Consolidating...",
    parsing: "Building visualization...",
    complete: "Complete!",
    error: "An error occurred",
};

export const ProcessingProgress: React.FC<ProcessingProgressProps> = ({
    isActive,
    status,
    progress,
    statusLabels = {},
    className,
}) => {
    if (!isActive) return null;

    const labels = { ...defaultStatusLabels, ...statusLabels };
    const label = labels[status] ?? "";

    return (
        <div className={`space-y-3 animate-in fade-in duration-200 ${className ?? ""}`}>
            <div className="flex items-center gap-3">
                <SpinnerGap className="size-5 text-accent animate-spin" />
                <span className="text-sm text-foreground">{label}</span>
            </div>
            <Progress value={progress} className="h-2" />
        </div>
    );
};

export default ProcessingProgress;

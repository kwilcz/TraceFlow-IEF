"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileCode, X, Plus } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { StagedFile } from "@/hooks/use-staged-files";

interface StagedFilesListProps {
    files: StagedFile[];
    onRemoveFile: (fileId: string) => void;
    onClearAll: () => void;
    onAddMore: () => void;
    disabled?: boolean;
}

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const StagedFilesList: React.FC<StagedFilesListProps> = ({
    files,
    onRemoveFile,
    onClearAll,
    onAddMore,
    disabled = false,
}) => {
    if (files.length === 0) return null;

    return (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                    {files.length} file{files.length > 1 ? "s" : ""} ready
                </span>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearAll}
                    disabled={disabled}
                    className="text-muted hover:text-danger"
                >
                    Clear all
                </Button>
            </div>

            <Separator />

            <ul className="space-y-1">
                {files.map((file) => (
                    <li
                        key={file.id}
                        className={cn(
                            "group flex items-center gap-3 py-2 px-3 -mx-3 rounded-lg",
                            "hover:bg-default/50 transition-colors duration-150",
                            "animate-in fade-in slide-in-from-left-2 duration-200",
                        )}
                    >
                        <FileCode className="size-5 text-accent shrink-0" weight="duotone" />

                        <span className="flex-1 text-sm text-foreground truncate" title={file.name}>
                            {file.name}
                        </span>

                        <span className="text-xs text-muted tabular-nums">{formatFileSize(file.size)}</span>

                        <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemoveFile(file.id);
                            }}
                            disabled={disabled}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-danger"
                            aria-label={`Remove ${file.name}`}
                        >
                            <X className="size-4" />
                        </Button>
                    </li>
                ))}
            </ul>

            <button
                type="button"
                onClick={onAddMore}
                disabled={disabled}
                className={cn(
                    "flex items-center gap-2 text-sm text-muted hover:text-accent py-2 transition-colors",
                    "disabled:pointer-events-none disabled:opacity-50",
                )}
            >
                <Plus className="size-4" />
                Add more files
            </button>
        </div>
    );
};

export default StagedFilesList;
export { StagedFilesList };
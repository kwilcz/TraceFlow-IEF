"use client";

import React, { useRef, useCallback, useId, useImperativeHandle, forwardRef, useMemo, useState } from "react";
import { CloudArrowUp } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface FileTypeConfig {
    extensions: string[];
    mimeTypes: string[];
    label: string;
}

interface FileDropZoneProps {
    onFilesSelected: (files: FileList) => void;
    disabled?: boolean;
    fileTypes: FileTypeConfig[];
    maxFileSizeMB?: number;
    onValidationError?: (errors: string[]) => void;
}

export interface FileDropZoneRef {
    triggerFilePicker: () => void;
}

const formatFileSize = (sizeInMB: number): string => {
    if (sizeInMB >= 1) return `${sizeInMB}MB`;
    return `${sizeInMB * 1024}KB`;
};

const FileDropZone = forwardRef<FileDropZoneRef, FileDropZoneProps>(
    (
        {
            onFilesSelected,
            disabled = false,
            fileTypes,
            maxFileSizeMB = 10,
            onValidationError,
        },
        ref,
    ) => {
        const fileInputRef = useRef<HTMLInputElement>(null);
        const dropZoneId = useId();
        const [isDragOver, setIsDragOver] = useState(false);

        const acceptString = useMemo(() => {
            const extensions = fileTypes.flatMap((ft) => ft.extensions);
            const mimeTypes = fileTypes.flatMap((ft) => ft.mimeTypes);
            return [...extensions, ...mimeTypes].join(",");
        }, [fileTypes]);

        const supportedTypesLabel = useMemo(() => {
            return fileTypes.map((ft) => ft.label).join(", ");
        }, [fileTypes]);

        const extensionsSet = useMemo(() => {
            return new Set(fileTypes.flatMap((ft) => ft.extensions.map((ext) => ext.toLowerCase())));
        }, [fileTypes]);

        const mimeTypesSet = useMemo(() => {
            return new Set(fileTypes.flatMap((ft) => ft.mimeTypes.map((mt) => mt.toLowerCase())));
        }, [fileTypes]);

        useImperativeHandle(ref, () => ({
            triggerFilePicker: () => fileInputRef.current?.click(),
        }));

        const validateFiles = useCallback(
            (files: FileList): { valid: File[]; errors: string[] } => {
                const valid: File[] = [];
                const errors: string[] = [];
                const maxSizeBytes = maxFileSizeMB * 1024 * 1024;

                Array.from(files).forEach((file) => {
                    const fileExtension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
                    const isValidType =
                        extensionsSet.has(fileExtension) || mimeTypesSet.has(file.type.toLowerCase());

                    if (!isValidType) {
                        errors.push(`"${file.name}" is not a supported file type`);
                        return;
                    }

                    if (file.size > maxSizeBytes) {
                        errors.push(`"${file.name}" exceeds ${formatFileSize(maxFileSizeMB)} size limit`);
                        return;
                    }

                    valid.push(file);
                });

                return { valid, errors };
            },
            [extensionsSet, mimeTypesSet, maxFileSizeMB],
        );

        const processFiles = useCallback(
            (files: FileList) => {
                const { valid, errors } = validateFiles(files);

                if (errors.length > 0) {
                    onValidationError?.(errors);
                }

                if (valid.length > 0) {
                    const dataTransfer = new DataTransfer();
                    valid.forEach((file) => dataTransfer.items.add(file));
                    onFilesSelected(dataTransfer.files);
                }
            },
            [validateFiles, onValidationError, onFilesSelected],
        );

        const handleDragOver = useCallback(
            (e: React.DragEvent) => {
                e.preventDefault();
                e.stopPropagation();
                if (!disabled) setIsDragOver(true);
            },
            [disabled],
        );

        const handleDragLeave = useCallback((e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(false);
        }, []);

        const handleDrop = useCallback(
            (e: React.DragEvent) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragOver(false);

                if (disabled) return;

                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    processFiles(files);
                }
            },
            [disabled, processFiles],
        );

        const handleFileSelect = useCallback(
            (e: React.ChangeEvent<HTMLInputElement>) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                    processFiles(files);
                }
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            },
            [processFiles],
        );

        const handleBrowseClick = useCallback(() => {
            if (!disabled) {
                fileInputRef.current?.click();
            }
        }, [disabled]);

        const handleKeyDown = useCallback(
            (e: React.KeyboardEvent) => {
                if ((e.key === "Enter" || e.key === " ") && !disabled) {
                    e.preventDefault();
                    handleBrowseClick();
                }
            },
            [disabled, handleBrowseClick],
        );

        return (
            <>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={acceptString}
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    aria-label={`Select ${supportedTypesLabel} files`}
                />

                <div
                    id={dropZoneId}
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    aria-label={`Drop zone for ${supportedTypesLabel} files. Click to browse or drag and drop files here.`}
                    {...(disabled && { "aria-disabled": "true" })}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleBrowseClick}
                    onKeyDown={handleKeyDown}
                    className={cn(
                        "relative flex flex-col items-center justify-center gap-4 p-8 md:p-12",
                        "border-2 border-dashed rounded-2xl cursor-pointer",
                        "transition-all duration-200 ease-out",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        isDragOver
                            ? "border-accent bg-accent/5 scale-[1.01]"
                            : "border-border hover:border-accent/50 hover:bg-accent/2",
                        disabled && "pointer-events-none opacity-50 cursor-not-allowed",
                    )}
                >
                    <div
                        className={cn(
                            "p-4 rounded-full transition-colors duration-200",
                            isDragOver ? "bg-accent/10" : "bg-default",
                        )}
                    >
                        <CloudArrowUp
                            className={cn(
                                "size-10 transition-all duration-200",
                                isDragOver ? "text-accent scale-110" : "text-muted",
                            )}
                            weight={isDragOver ? "fill" : "regular"}
                        />
                    </div>

                    <div className="text-center space-y-1">
                        <p className="text-foreground font-medium">
                            {isDragOver ? "Release to add files" : "Drop files here"}
                        </p>
                        <p className="text-sm text-muted">
                            or <span className="text-accent cursor-pointer">click here</span> to add with
                            file dialog
                        </p>
                    </div>

                    <p className="text-xs text-muted">
                        Supports: {supportedTypesLabel} • Max {formatFileSize(maxFileSizeMB)} each
                    </p>
                </div>
            </>
        );
    },
);

FileDropZone.displayName = "FileDropZone";

export default FileDropZone;
export { FileDropZone };
export type { FileDropZoneRef, FileTypeConfig as FileDropZoneFileType };

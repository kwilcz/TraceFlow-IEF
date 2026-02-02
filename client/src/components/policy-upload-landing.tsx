"use client";

import React, {useCallback, useRef} from "react";
import {Button} from "@/components/ui/button";
import {Collapsible, CollapsibleTrigger, CollapsibleContent} from "@/components/ui/collapsible";
import {StatusMessageDisplay} from "@/components/ui/status-message";
import {ProcessingProgress} from "@/components/ui/processing-progress";
import {Info, SpinnerGap, ArrowRight, CaretDown, BugIcon, FileArrowUpIcon} from "@phosphor-icons/react";
import {useUploadProgress} from "@/hooks/use-upload-progress";
import {useStagedFiles} from "@/hooks/use-staged-files";
import {useStatusMessage} from "@/hooks/use-status-message";
import type {PolicyData} from "@/lib/policyParser";

import {FileDropZone, type FileDropZoneRef, type FileTypeConfig} from "./upload/file-drop-zone";
import {StagedFilesList} from "./upload/staged-files-list";

interface PolicyUploadLandingProps {
    onParsedData: (parsedData: PolicyData) => void;
}

const XML_FILE_TYPES: FileTypeConfig[] = [
    {
        extensions: [".xml"],
        mimeTypes: ["text/xml", "application/xml"],
        label: "XML",
    },
];

const MAX_FILE_SIZE_MB = 10;

const PolicyUploadLanding: React.FC<PolicyUploadLandingProps> = ({onParsedData}) => {
    const dropZoneRef = useRef<FileDropZoneRef>(null);

    const {files, addFiles, removeFile, clearAll, hasFiles, getFilesAsArray} = useStagedFiles();
    const {message: statusMessage, showMessage, clearMessage} = useStatusMessage();
    const {uploadWithProgress, uploadState} = useUploadProgress();

    const isProcessing = uploadState.isUploading;

    const handleValidationError = useCallback(
        (errors: string[]) => {
            showMessage("warning", `Skipped: ${errors.join(", ")}`);
        },
        [showMessage],
    );

    const handleFilesSelected = useCallback(
        (fileList: FileList) => {
            const {added, duplicates} = addFiles(Array.from(fileList));

            if (added.length > 0) {
                showMessage("success", `Added ${added.length} file${added.length > 1 ? "s" : ""}`);
            }

            if (duplicates.length > 0) {
                showMessage("warning", `Skipped duplicates: ${duplicates.join(", ")}`);
            }
        },
        [addFiles, showMessage],
    );

    const handleClearAll = useCallback(() => {
        clearAll();
        clearMessage();
    }, [clearAll, clearMessage]);

    const triggerFilePicker = useCallback(() => {
        dropZoneRef.current?.triggerFilePicker();
    }, []);

    const handleProcessPolicies = useCallback(async () => {
        if (!hasFiles) {
            showMessage("warning", "Please add at least one policy file to process.");
            return;
        }

        clearMessage();

        try {
            const result = await uploadWithProgress(getFilesAsArray());

            if (result) {
                showMessage("success", "Policies processed successfully!");
                setTimeout(() => onParsedData(result.parsedData), 0);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to process policies";
            showMessage("error", errorMessage, false);
        }
    }, [hasFiles, getFilesAsArray, uploadWithProgress, onParsedData, showMessage, clearMessage]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen-navbar px-4 py-8">
            <div className="w-full max-w-2xl space-y-8">
                {/* Header */}
                <header className="text-center space-y-3">
                    <div className="bg-primary/10 w-fit h-fit p-6 rounded-full mx-auto">
                        <FileArrowUpIcon weight={"fill"} className="size-12 text-primary"/>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground">Upload Your B2C Policies</h1>
                    <p className="text-muted text-base md:text-lg max-w-lg mx-auto">
                        Transform your Azure AD B2C custom policy XML files into an interactive visual flow diagram
                    </p>
                </header>

                {/* Requirements - Collapsible */}
                <Collapsible defaultOpen className="text-sm text-muted bg-accent/5 rounded-lg px-4 py-3">
                    <CollapsibleTrigger
                        className="flex items-center gap-2 w-full justify-between group [&[data-panel-open]>svg]:rotate-180">
                        <span className="flex items-center gap-2">
                            <Info className="size-4 shrink-0 text-accent" weight="fill"/>
                            <span>File Requirements</span>
                        </span>
                        <CaretDown
                            className="size-4 text-muted group-hover:text-foreground transition-transform duration-200"/>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="overflow-hidden data-open:animate-in data-closed:animate-out">
                        <ul className="space-y-1 pl-6 py-2">
                            <li>Valid Azure AD B2C Custom Policy XML files</li>
                            <li>Include base + extension policies for full inheritance</li>
                            <li>Add relying party policies for complete user journey flows</li>
                        </ul>
                    </CollapsibleContent>
                </Collapsible>

                {/* Drop Zone */}
                <FileDropZone
                    ref={dropZoneRef}
                    fileTypes={XML_FILE_TYPES}
                    maxFileSizeMB={MAX_FILE_SIZE_MB}
                    onFilesSelected={handleFilesSelected}
                    onValidationError={handleValidationError}
                    disabled={isProcessing}
                />

                {/* Staged Files */}
                <StagedFilesList
                    files={files}
                    onRemoveFile={removeFile}
                    onClearAll={handleClearAll}
                    onAddMore={triggerFilePicker}
                    disabled={isProcessing}
                />

                {/* Status Message */}
                <StatusMessageDisplay message={statusMessage} onDismiss={clearMessage}/>

                {/* Processing State */}
                <ProcessingProgress
                    isActive={isProcessing}
                    status={uploadState.status}
                    progress={uploadState.progress}
                    statusLabels={{
                        uploading: "Processing files...",
                        processing: "Consolidating policies...",
                        parsing: "Building flow diagram...",
                    }}
                />

                {/* Action Button */}
                <div className="pt-4">
                    <Button
                        size="lg"
                        onClick={handleProcessPolicies}
                        disabled={!hasFiles || isProcessing}
                        className="w-full"
                    >
                        {isProcessing ? (
                            <>
                                <SpinnerGap className="size-5 animate-spin mr-2"/>
                                Processing...
                            </>
                        ) : (
                            <>
                                Process Policies
                                <ArrowRight className="size-5 ml-2"/>
                            </>
                        )}
                    </Button>
                </div>

                {/* Privacy Note */}
                <p className="text-center text-xs text-muted">
                    🔒 100% Client-Side Processing • Your policy files never leave your browser
                </p>
            </div>
        </div>
    );
};

export default PolicyUploadLanding;

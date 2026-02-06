"use client";

import { useState, useCallback } from "react";

export interface StagedFile {
    id: string;
    file: File;
    name: string;
    size: number;
}

const generateFileId = (): string => `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

interface UseStagedFilesReturn {
    files: StagedFile[];
    addFiles: (newFiles: File[]) => { added: StagedFile[]; duplicates: string[] };
    removeFile: (fileId: string) => void;
    clearAll: () => void;
    hasFiles: boolean;
    getFilesAsArray: () => File[];
}

export function useStagedFiles(): UseStagedFilesReturn {
    const [files, setFiles] = useState<StagedFile[]>([]);

    const addFiles = useCallback(
        (newFiles: File[]): { added: StagedFile[]; duplicates: string[] } => {
            const added: StagedFile[] = [];
            const duplicates: string[] = [];

            newFiles.forEach((file) => {
                const isDuplicate = files.some((sf) => sf.name === file.name && sf.size === file.size);

                if (isDuplicate) {
                    duplicates.push(file.name);
                } else {
                    added.push({ id: generateFileId(), file, name: file.name, size: file.size });
                }
            });

            if (added.length > 0) {
                setFiles((prev) => [...prev, ...added]);
            }

            return { added, duplicates };
        },
        [files],
    );

    const removeFile = useCallback((fileId: string) => {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
    }, []);

    const clearAll = useCallback(() => {
        setFiles([]);
    }, []);

    const getFilesAsArray = useCallback(() => {
        return files.map((sf) => sf.file);
    }, [files]);

    return {
        files,
        addFiles,
        removeFile,
        clearAll,
        hasFiles: files.length > 0,
        getFilesAsArray,
    };
}

export default useStagedFiles;

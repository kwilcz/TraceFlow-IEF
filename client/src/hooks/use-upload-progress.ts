import { useState, useCallback } from 'react';
import { PolicyApiService } from '@/lib/policy-api-service';
import { parsePolicyXml, type PolicyData } from '@/lib/policyParser';
import { usePolicyStore } from '@/stores/policy-store';
import type InternalError from '@/types/internal-error';

interface UploadState {
  isUploading: boolean;
  progress: number;
  status: 'uploading' | 'processing' | 'parsing' | 'complete' | 'error';
  error?: string;
  fileName?: string;
  totalFiles: number;
  currentFile: number;
  parseErrors?: InternalError[];
}

interface UploadResult {
  consolidatedXml: string;
  parsedData: PolicyData;
}

/**
 * Custom hook for handling policy file uploads with progress tracking and parsing.
 * 
 * Provides comprehensive upload functionality including:
 * - Real-time upload progress tracking
 * - Modal state management
 * - Server-side policy consolidation
 * - XML parsing with error handling
 * - Auto-close on success
 * 
 * @returns Object with upload functions and state
 */
export const useUploadProgress = () => {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    status: 'uploading',
    totalFiles: 0,
    currentFile: 1,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const loadPolicyData = usePolicyStore(state => state.loadPolicyData);

  const uploadWithProgress = useCallback(async (files: File[]): Promise<UploadResult | null> => {
    if (files.length === 0) return null;

    setUploadState({
      isUploading: true,
      progress: 0,
      status: 'uploading',
      totalFiles: files.length,
      currentFile: 1,
      fileName: files.length === 1 ? files[0].name : undefined,
      error: undefined,
      parseErrors: undefined,
    });
    setIsModalOpen(true);

    try {
      // Upload phase
      const response = await PolicyApiService.consolidatePoliciesWithProgress(files, (uploadProgress) => {
        setUploadState(prev => ({
          ...prev,
          progress: uploadProgress.progress,
          status: uploadProgress.progress >= 100 ? 'processing' : 'uploading',
        }));
      });

      // Load policy data into store
      loadPolicyData(response);

      // Parsing phase
      setUploadState(prev => ({
        ...prev,
        progress: 100,
        status: 'parsing',
      }));

      try {
        // Parse the consolidated XML to generate the flow diagrams
        const parseResult = await parsePolicyXml(response.consolidatedXml);
        
        // Check for parsing errors/warnings
        if (parseResult.errors && parseResult.errors.size > 0) {
          setUploadState(prev => ({
            ...prev,
            status: 'complete',
            parseErrors: Array.from(parseResult.errors!),
          }));
        } else {
          setUploadState(prev => ({
            ...prev,
            status: 'complete',
          }));
        }

        // Auto-close on success after 1 second
        setTimeout(() => {
          setIsModalOpen(false);
          setUploadState(prev => ({ ...prev, isUploading: false }));
        }, 1000);

        return {
          consolidatedXml: response.consolidatedXml,
          parsedData: parseResult,
        };
      } catch (parseError) {
        const errorMessage = parseError instanceof Error ? parseError.message : 'Failed to parse policy XML';
        setUploadState(prev => ({
          ...prev,
          status: 'error',
          error: `Parsing failed: ${errorMessage}`,
        }));
        return null;
      }
    } catch (error) {
      let errorMessage = 'Upload failed';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }

      setUploadState(prev => ({
        ...prev,
        progress: 0,
        status: 'error',
        error: errorMessage,
      }));
      
      return null;
    }
  }, [loadPolicyData]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setUploadState(prev => ({ ...prev, isUploading: false }));
  }, []);

  return {
    uploadWithProgress,
    uploadState,
    isModalOpen,
    closeModal,
  };
};

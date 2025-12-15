import React from 'react';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Upload, Warning as AlertCircle, SpinnerGap as Loader2, X, Warning as AlertTriangle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import type InternalError from '@/types/internal-error';

interface UploadProgressModalProps {
  isOpen: boolean;
  progress: number;
  status: 'uploading' | 'processing' | 'parsing' | 'complete' | 'error';
  fileName?: string;
  totalFiles?: number;
  currentFile?: number;
  error?: string;
  parseErrors?: InternalError[];
  onClose?: () => void;
  canClose?: boolean;
}

/**
 * Modal component for displaying upload progress and status.
 * 
 * Features:
 * - Real-time progress bar
 * - Status indicators with appropriate icons
 * - File name display with truncation for long names
 * - Error display for upload failures
 * - Parsing error/warning display
 * - Auto-close on success, manual close for errors
 * 
 * @param props UploadProgressModalProps
 */
const UploadProgressModal: React.FC<UploadProgressModalProps> = ({
  isOpen,
  progress,
  status,
  fileName,
  totalFiles = 1,
  currentFile = 1,
  error,
  parseErrors,
  onClose,
  canClose = false
}) => {
  if (!isOpen) return null;

  const truncateFileName = (name: string, maxLength: number = 50): string => {
    if (name.length <= maxLength) return name;
    
    // Try to keep the file extension visible
    const extension = name.split('.').pop();
    const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
    
    if (extension && nameWithoutExt.length > maxLength - extension.length - 4) {
      return `${nameWithoutExt.substring(0, maxLength - extension.length - 4)}...${extension}`;
    }
    
    return `${name.substring(0, maxLength - 3)}...`;
  };

  const getFileDisplayInfo = () => {
    if (!fileName) return null;
    
    if (totalFiles > 1) {
      return `${totalFiles} files selected`;
    }
    
    // For single files, show truncated name
    return truncateFileName(fileName);
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return <Upload className="w-6 h-6 text-blue-500" />;
      case 'processing':
      case 'parsing':
        return <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />;
      case 'complete':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      default:
        return <Loader2 className="w-6 h-6 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        if (totalFiles > 1) {
          return `Uploading file ${currentFile} of ${totalFiles}`;
        }
        return 'Uploading file';
      case 'processing':
        return 'Processing policies on server';
      case 'parsing':
        return 'Parsing policy structure';
      case 'complete':
        return totalFiles > 1 ? `${totalFiles} files uploaded successfully!` : 'File uploaded successfully!';
      case 'error':
        return 'Upload failed';
      default:
        return 'Processing...';
    }
  };

  const getProgressValue = () => {
    if (status === 'complete') return 100;
    if (status === 'error') return 0;
    return Math.max(0, Math.min(100, progress));
  };

  const showProgress = status !== 'error';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg p-6 w-full max-w-lg mx-auto shadow-lg border min-w-80">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Policy Upload</h3>
          {canClose && onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            {getStatusIcon()}
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {getStatusText()}
              </p>
              {fileName && (
                <p className="text-xs text-muted-foreground mt-1" title={fileName}>
                  <span className="inline-block max-w-full truncate">
                    {getFileDisplayInfo()}
                  </span>
                </p>
              )}
            </div>
          </div>

          {showProgress && (
            <div className="space-y-2">
              <Progress value={getProgressValue()} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {status === 'uploading' && `${Math.round(getProgressValue())}% uploaded`}
                  {status === 'processing' && 'Processing...'}
                  {status === 'parsing' && 'Parsing...'}
                  {status === 'complete' && 'Complete'}
                </span>
                {totalFiles > 1 && status === 'uploading' && (
                  <span>{currentFile}/{totalFiles} files</span>
                )}
              </div>
            </div>
          )}

          {error && status === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-red-800 mb-1">Upload Failed</h4>
                  <p className="text-sm text-red-700 whitespace-pre-wrap">{error}</p>
                </div>
              </div>
            </div>
          )}

          {status === 'complete' && !parseErrors && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-green-800 mb-1">Upload Successful</h4>
                  <p className="text-sm text-green-700">
                    Your policies have been successfully uploaded and parsed without issues.
                  </p>
                </div>
              </div>
            </div>
          )}

          {status === 'complete' && parseErrors && parseErrors.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">Parsing completed with warnings</h4>
                  <div className="space-y-2">
                    {parseErrors.slice(0, 5).map((error, index) => (
                      <div key={index} className="text-sm text-yellow-700">
                        <p className="font-medium">{error.error}</p>
                        {error.exception && <p className="text-xs mt-1">{error.exception.message}</p>}
                      </div>
                    ))}
                    {parseErrors.length > 5 && (
                      <p className="text-xs text-yellow-600 italic">
                        ... and {parseErrors.length - 5} more warning{parseErrors.length - 5 > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {status === 'error' && onClose && (
            <div className="flex justify-end pt-2">
              <Button onClick={onClose} variant="destructive">
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadProgressModal;

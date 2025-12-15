import React from 'react';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Upload, Warning as AlertCircle, SpinnerGap as Loader2, Gear as Settings } from '@phosphor-icons/react';

interface UploadProgressToastProps {
  progress: number;
  status: 'uploading' | 'processing' | 'parsing' | 'complete' | 'error';
  fileName?: string;
  totalFiles?: number;
  currentFile?: number;
  error?: string;
}

const UploadProgressToast: React.FC<UploadProgressToastProps> = ({
  progress,
  status,
  fileName,
  totalFiles = 1,
  currentFile = 1,
  error
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return <Upload className="w-4 h-4 text-blue-500" />;
      case 'processing':
      case 'parsing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Settings className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        if (totalFiles > 1) {
          return `Uploading file ${currentFile}/${totalFiles}${fileName ? `: ${fileName}` : ''}`;
        }
        return fileName ? `Uploading ${fileName}` : 'Uploading file';
      case 'processing':
        return 'Processing policies on server';
      case 'parsing':
        return 'Parsing policy structure';
      case 'complete':
        return 'Upload completed successfully!';
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
    <div className="w-full min-w-80">
      <div className="flex items-center gap-3 mb-3">
        {getStatusIcon()}
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            {getStatusText()}
          </p>
          {showProgress && (
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(getProgressValue())}% complete
            </p>
          )}
        </div>
      </div>
      
      {showProgress && (
        <Progress 
          value={getProgressValue()} 
          className="h-2 mb-2" 
        />
      )}
      
      {error && status === 'error' && (
        <p className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded border border-red-200">
          {error}
        </p>
      )}
    </div>
  );
};

export { UploadProgressToast };

import React, {useRef} from 'react';
import {Button} from '@/components/ui/button';
import {toast} from 'sonner';
import { FolderOpen as FolderUpIcon } from '@phosphor-icons/react'
import {useUploadProgress} from '@/hooks/use-upload-progress';
import UploadProgressModal from '@/components/upload-progress-modal';
import type { PolicyData } from '@/lib/policyParser';

interface FileUploadProps {
    onParsedData?: (parsedData: PolicyData) => void;
    className?: string;
}

const PolicyUploadButton: React.FC<FileUploadProps> = ({onParsedData, className}) => {

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { uploadWithProgress, uploadState, isModalOpen, closeModal } = useUploadProgress();

    // Function to handle changes in the file input element
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = event.target.files;
        if (!selectedFiles || selectedFiles.length <= 0)
            return;
        
        const fileArray = Array.from(selectedFiles);
        
        if (fileArray.every(file => file.type !== 'text/xml')) {
            toast.error('The selected file(s) are not valid XML files.');
            return;
        }
        
        try {
            const result = await uploadWithProgress(fileArray);
            
            if (result && onParsedData) {
                setTimeout(() => onParsedData(result.parsedData), 0);
            }
        } catch (error) {
            console.error('Error uploading policies:', error);
            // Error is already handled by the hook and displayed in modal
        }
    };

    const handleModalClose = () => {
        closeModal();
    };

    // Only allow manual close for error states, success will auto-close
    const canCloseModal = uploadState.status === 'error';

    return (
        <>
            <div className={className}>
                {/* input that is used on button click, just to have a pretty UI :) */}
                <input
                    type="file"
                    ref={fileInputRef}
                    accept=".xml"
                    onChange={(evt) => handleFileChange(evt)}
                    className="hidden"
                    multiple
                    aria-label="Upload policy files"
                />

                <Button 
                    variant='default' 
                    className={'animate-in fade-in zoom-in'} 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadState.isUploading}
                >
                    <FolderUpIcon className="mr-2" size={22} />
                    {uploadState.isUploading ? 'Uploading...' : 'Upload Policies'}
                </Button>
            </div>

            <UploadProgressModal
                isOpen={isModalOpen}
                progress={uploadState.progress}
                status={uploadState.status}
                fileName={uploadState.fileName}
                totalFiles={uploadState.totalFiles}
                currentFile={uploadState.currentFile}
                error={uploadState.error}
                parseErrors={uploadState.parseErrors}
                onClose={handleModalClose}
                canClose={canCloseModal}
            />
        </>
    );
};

export default PolicyUploadButton;
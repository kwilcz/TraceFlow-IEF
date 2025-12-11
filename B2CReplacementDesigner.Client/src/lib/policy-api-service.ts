import config from '@/config';
import type { PolicyUploadResponse } from '@/types/policy-store';

interface UploadProgress {
    progress: number;
    fileName?: string;
    currentFile: number;
    totalFiles: number;
}

export class PolicyApiService {    
    static async consolidatePolicies(policies: File[]): Promise<PolicyUploadResponse> {
        if (policies.length === 0) {
            throw new Error('No policies provided');
        }

        const formData = new FormData();
        policies.forEach(file => {
            formData.append('files', file);
        });
        
        let apiResponse;
        
        try {
            apiResponse = await fetch(`${config.apiBaseUrl}/${config.policiesMergeEndpoint}`, {
                method: 'POST',
                body: formData,
            });
        }
        catch {
            throw new Error(`Failed to consolidate policies.`);
        }
        
        if (!apiResponse.ok) {
            throw new Error(`Failed to consolidate policies: ${apiResponse.status} - ${apiResponse.statusText}`);
        }
        
        return await apiResponse.json();
    }

    static async consolidatePoliciesWithProgress(
        policies: File[], 
        onProgress: (progress: UploadProgress) => void
    ): Promise<PolicyUploadResponse> {
        if (policies.length === 0) {
            throw new Error('No policies provided');
        }

        return new Promise((resolve, reject) => {
            const formData = new FormData();
            policies.forEach(file => {
                formData.append('files', file);
            });

            const xhr = new XMLHttpRequest();

            // Track upload progress
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const progress = (event.loaded / event.total) * 100;
                    onProgress({
                        progress,
                        currentFile: 1, // For now, we treat all files as a single upload
                        totalFiles: policies.length,
                        fileName: policies.length === 1 ? policies[0].name : undefined
                    });
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText) as PolicyUploadResponse;
                        resolve(response);
                    } catch {
                        reject(new Error('Failed to parse server response'));
                    }
                } else {
                    reject(new Error(`Failed to consolidate policies: ${xhr.status} - ${xhr.statusText}`));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Failed to consolidate policies.'));
            });

            xhr.addEventListener('abort', () => {
                reject(new Error('Upload was aborted.'));
            });

            xhr.open('POST', `${config.apiBaseUrl}/${config.policiesMergeEndpoint}`);
            xhr.send(formData);
        });
    }

    static async consolidatePoliciesWithProgressRaw(
        policies: File[], 
        onProgress: (progress: UploadProgress) => void
    ): Promise<string> {
        if (policies.length === 0) 
            return '';

        return new Promise((resolve, reject) => {
            const formData = new FormData();
            policies.forEach(file => {
                formData.append('files', file);
            });

            const xhr = new XMLHttpRequest();

            // Track upload progress
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const progress = (event.loaded / event.total) * 100;
                    onProgress({
                        progress,
                        currentFile: 1, // For now, we treat all files as a single upload
                        totalFiles: policies.length,
                        fileName: policies.length === 1 ? policies[0].name : undefined
                    });
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(xhr.responseText);
                } else {
                    reject(new Error(`Failed to consolidate policies: ${xhr.status} - ${xhr.statusText}`));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Failed to consolidate policies.'));
            });

            xhr.addEventListener('abort', () => {
                reject(new Error('Upload was aborted.'));
            });

            xhr.open('POST', `${config.apiBaseUrl}/${config.policiesMergeEndpoint}`);
            xhr.send(formData);
        });
    }
}
interface InternalError {
    error: string;
    severity: 'error' | 'warning';
    exception?: Error;
}

export function addInternalError(error: string, severity: 'error' | 'warning', exception?: Error): InternalError {
    return { error, severity, exception };
}

export default InternalError;
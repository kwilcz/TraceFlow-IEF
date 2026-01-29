"use client";

import { useState, useCallback, useRef } from "react";
import type { StatusMessage, MessageType } from "@/components/ui/status-message";

interface UseStatusMessageOptions {
    autoClearDelay?: number;
    autoClearExclude?: MessageType[];
}

interface UseStatusMessageReturn {
    message: StatusMessage | null;
    showMessage: (type: MessageType, text: string, autoClear?: boolean) => void;
    clearMessage: () => void;
}

export function useStatusMessage(options: UseStatusMessageOptions = {}): UseStatusMessageReturn {
    const { autoClearDelay = 5000, autoClearExclude = ["error"] } = options;
    const [message, setMessage] = useState<StatusMessage | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearMessage = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setMessage(null);
    }, []);

    const showMessage = useCallback(
        (type: MessageType, text: string, autoClear = true) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            setMessage({ type, text });

            const shouldAutoClear = autoClear && !autoClearExclude.includes(type);
            if (shouldAutoClear) {
                timeoutRef.current = setTimeout(() => {
                    setMessage(null);
                    timeoutRef.current = null;
                }, autoClearDelay);
            }
        },
        [autoClearDelay, autoClearExclude],
    );

    return {
        message,
        showMessage,
        clearMessage,
    };
}

export default useStatusMessage;

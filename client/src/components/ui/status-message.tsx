"use client";

import React from "react";
import { CheckCircle, Warning, Info, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type MessageType = "info" | "success" | "warning" | "error";

export interface StatusMessage {
    type: MessageType;
    text: string;
}

interface StatusMessageDisplayProps {
    message: StatusMessage | null;
    onDismiss?: () => void;
    className?: string;
}

const iconClass = "size-4 shrink-0";

const icons: Record<MessageType, React.ReactNode> = {
    success: <CheckCircle className={cn(iconClass, "text-success")} weight="fill" />,
    warning: <Warning className={cn(iconClass, "text-warning")} weight="fill" />,
    error: <Warning className={cn(iconClass, "text-danger")} weight="fill" />,
    info: <Info className={cn(iconClass, "text-accent")} weight="fill" />,
};

const bgColors: Record<MessageType, string> = {
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    error: "bg-danger/10 text-danger",
    info: "bg-accent/10 text-accent",
};

export const StatusMessageDisplay: React.FC<StatusMessageDisplayProps> = ({
    message,
    onDismiss,
    className,
}) => {
    if (!message) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            className={cn(
                "flex items-start gap-2 p-3 rounded-lg text-sm",
                "animate-in fade-in slide-in-from-bottom-2 duration-200",
                bgColors[message.type],
                className,
            )}
        >
            {icons[message.type]}
            <span className="flex-1">{message.text}</span>
            {onDismiss && (
                <button
                    type="button"
                    onClick={onDismiss}
                    className="p-0.5 hover:opacity-70 transition-opacity"
                    aria-label="Dismiss message"
                >
                    <X className="size-4" />
                </button>
            )}
        </div>
    );
};

export default StatusMessageDisplay;

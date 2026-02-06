import React from 'react';
import { cn } from '@/lib/utils';

interface ActionsProps {
    children: React.ReactNode;
    className?: string;
}

export function Actions({ children, className }: ActionsProps) {
    return (
        <div className={cn('top-navbar-actions', className)}>
            {children}
        </div>
    );
}

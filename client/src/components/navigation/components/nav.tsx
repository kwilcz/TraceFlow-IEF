import React from 'react';
import { NavigationMenu } from '@base-ui/react/navigation-menu';
import { cn } from '@/lib/utils';

interface NavProps {
    children: React.ReactNode;
    className?: string;
}

export function Nav({ children, className }: NavProps) {
    return (
        <NavigationMenu.List className={cn('top-navbar-nav', className)}>
            {children}
        </NavigationMenu.List>
    );
}

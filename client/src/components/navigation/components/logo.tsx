import React from 'react';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils';

interface LogoProps {
    href?: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}

export function Logo({ href = '/', icon, children, className }: LogoProps) {
    return (
        <Link to={href} className={cn('top-navbar-logo', className)}>
            {icon && <span className="top-navbar-logo-icon">{icon}</span>}
            <span className="top-navbar-logo-text">{children}</span>
        </Link>
    );
}

import React from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { useNavbarContext } from '../navbar.context';

interface MobileMenuItemProps {
    href: string;
    children: React.ReactNode;
    icon?: React.ReactNode;
    disabled?: boolean;
    external?: boolean;
    className?: string;
}

export function MobileMenuItem({ 
    href, 
    children, 
    icon,
    disabled,
    external, 
    className 
}: MobileMenuItemProps) {
    const location = useLocation();
    const { closeMobileMenu } = useNavbarContext();
    
    const isActive = location.pathname === href;

    const handleClick = () => {
        if (!disabled) {
            closeMobileMenu();
        }
    };

    const content = (
        <>
            {icon && <span className="top-navbar-mobile-item-icon">{icon}</span>}
            <span>{children}</span>
        </>
    );

    if (external) {
        return (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                data-active={isActive}
                data-disabled={disabled || undefined}
                className={cn('top-navbar-mobile-item', className)}
                onClick={handleClick}
            >
                {content}
            </a>
        );
    }

    if (disabled) {
        return (
            <span
                data-active={false}
                data-disabled
                className={cn('top-navbar-mobile-item', className)}
            >
                {content}
            </span>
        );
    }

    return (
        <Link
            to={href}
            data-active={isActive}
            className={cn('top-navbar-mobile-item', className)}
            onClick={handleClick}
        >
            {content}
        </Link>
    );
}

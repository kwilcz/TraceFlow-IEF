import { cn } from '@/lib/utils';
import React from 'react';

interface WithBlurredBackgroundProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

// Used in that way so no content is blurred. This is a bug in current implementation of backdrop-filter in Chrome
const WithBlurredBackground: React.FC<WithBlurredBackgroundProps> = ({ children, className, style }) => {
    return (
        <div className={cn("overflow-hidden", className)} style={style}>
            {children}
            <div className={cn(`absolute top-0 left-0 w-full h-full backdrop-blur-sm -z-1`, className)} />
        </div>
    );
};

export default WithBlurredBackground;
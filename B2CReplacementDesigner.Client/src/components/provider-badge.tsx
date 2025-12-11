import { Badge } from '@/components/ui/badge';
import { getProviderBadgeColor } from '@/types/technical-profile';
import { cn } from '@/lib/utils';

interface ProviderBadgeProps {
    providerName?: string;
    className?: string;
}

export function ProviderBadge({ providerName, className }: ProviderBadgeProps) {
    if (!providerName) return null;

    const colorClass = getProviderBadgeColor(providerName);

    return (
        <Badge 
            className={cn(
                colorClass, 
                "text-white font-semibold text-xs px-2 py-1",
                className
            )}
        >
            {providerName}
        </Badge>
    );
}

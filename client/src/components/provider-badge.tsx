import { Badge } from '@/components/ui/badge';
import type { Protocol } from '@/types/technical-profile';
import {
    getProtocolBadgeColor,
    getProtocolHandlerBadgeColor,
    getProtocolHandlerShortName,
    PROTOCOL_NAME,
} from '@/types/technical-profile';
import { cn } from '@/lib/utils';

interface ProtocolBadgesProps {
    protocol?: Protocol;
    className?: string;
}

export function ProtocolBadges({ protocol, className }: ProtocolBadgesProps) {
    if (!protocol?.name) return null;

    const protocolColorClass = getProtocolBadgeColor(protocol.name);
    const handlerShortName =
        protocol.name === PROTOCOL_NAME.Proprietary ? getProtocolHandlerShortName(protocol.handler) : undefined;
    const handlerColorClass = getProtocolHandlerBadgeColor(handlerShortName);

    return (
        <div className={cn('flex flex-wrap items-center gap-1', className)}>
            <Badge className={cn(protocolColorClass, 'text-white font-semibold text-xs px-2 py-1')}>
                {protocol.name}
            </Badge>
            {protocol.name === PROTOCOL_NAME.Proprietary && handlerShortName && (
                <Badge className={cn(handlerColorClass, 'text-white font-semibold text-xs px-2 py-1')}>
                    {handlerShortName}
                </Badge>
            )}
        </div>
    );
}

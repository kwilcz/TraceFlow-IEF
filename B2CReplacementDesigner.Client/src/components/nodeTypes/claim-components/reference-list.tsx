import React, { createContext, useContext, useMemo, useState } from "react";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { MAX_VISIBLE_CLAIMS } from "./types";

interface ReferenceListContextValue {
    isExpanded: boolean;
    hiddenCount: number;
    hasMore: boolean;
    toggle: () => void;
}

const ReferenceListContext = createContext<ReferenceListContextValue | null>(null);

function useReferenceListContext() {
    const ctx = useContext(ReferenceListContext);
    if (!ctx) {
        throw new Error("ReferenceList.Toggle must be used inside <ReferenceList>");
    }

    return ctx;
}

interface ReferenceListProps<T> {
    items: T[];
    maxVisible?: number;
    className?: string;
    children: (visibleItems: T[]) => React.ReactNode;
}

function ReferenceListRoot<T>({ items, maxVisible = MAX_VISIBLE_CLAIMS, className, children }: ReferenceListProps<T>) {
    const [isExpanded, setIsExpanded] = useState(false);

    const visibleItems = isExpanded ? items : items.slice(0, maxVisible);
    const hiddenCount = Math.max(items.length - visibleItems.length, 0);
    const hasMore = hiddenCount > 0;

    const value = useMemo<ReferenceListContextValue>(
        () => ({
            isExpanded,
            hiddenCount,
            hasMore,
            toggle: () => setIsExpanded((prev) => !prev),
        }),
        [isExpanded, hiddenCount, hasMore]
    );

    return (
        <ReferenceListContext.Provider value={value}>
            <div className={cn("flex flex-wrap gap-1", className)}>{children(visibleItems)}</div>
        </ReferenceListContext.Provider>
    );
}

interface ReferenceListToggleProps {
    className?: string;
    collapsedLabel?: React.ReactNode;
    expandedLabel?: React.ReactNode;
    titleCollapsed?: string;
    titleExpanded?: string;
}

const ReferenceListToggle: React.FC<ReferenceListToggleProps> = ({
    className,
    collapsedLabel,
    expandedLabel,
    titleCollapsed = "Show all items",
    titleExpanded = "Show fewer items",
}) => {
    const { hasMore, hiddenCount, isExpanded, toggle } = useReferenceListContext();

    if (!hasMore) {
        return null;
    }

    const defaultCollapsed = (
        <>
            <CaretDown className="w-2.5 h-2.5" />+{hiddenCount} more
        </>
    );

    const defaultExpanded = (
        <>
            <CaretUp className="w-2.5 h-2.5" />Show less
        </>
    );

    return (
        <button
            type="button"
            onClick={toggle}
            title={isExpanded ? titleExpanded : titleCollapsed}
            className={cn(
                "px-1.5 py-0.5 text-[10px] rounded transition-colors hover:bg-opacity-80 flex items-center gap-1",
                className
            )}
        >
            {isExpanded ? expandedLabel ?? defaultExpanded : collapsedLabel ?? defaultCollapsed}
        </button>
    );
};

type ReferenceListComponent = (<T>(props: ReferenceListProps<T>) => React.ReactElement | null) & {
    Toggle: typeof ReferenceListToggle;
};

const ReferenceList = Object.assign(ReferenceListRoot, { Toggle: ReferenceListToggle }) as ReferenceListComponent;

export { ReferenceList };

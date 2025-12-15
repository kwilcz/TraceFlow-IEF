import React, { createContext, useState, useCallback, ReactNode, useRef } from 'react';
import type { AnyTrustFrameworkEntity, EntityType } from '@/types/trust-framework-entities';
import type { Node } from '@xyflow/react';

/**
 * Sidebar navigation item - can be either a Node or a TrustFrameworkEntity
 */
export interface SidebarNavigationItem {
    type: 'node' | 'entity';
    data: Node | AnyTrustFrameworkEntity;
    label: string;
    entityType?: EntityType;
}

/**
 * Sidebar navigation state and methods
 */
export interface SidebarNavigationContextValue {
    /** Current navigation stack (breadcrumb trail) */
    history: SidebarNavigationItem[];
    
    /** Current item being viewed */
    current: SidebarNavigationItem | null;
    
    /** Whether the sidebar is currently open */
    isSidebarOpen: boolean;
    
    /** Navigate to a node */
    navigateToNode: (node: Node) => void;
    
    /** Navigate to an entity */
    navigateToEntity: (entity: AnyTrustFrameworkEntity, label?: string) => void;
    
    /** Go back to previous item */
    goBack: () => void;
    
    /** Navigate to specific history item by index */
    navigateToHistoryItem: (index: number) => void;
    
    /** Clear navigation history */
    clearHistory: () => void;
    
    /** Open the sidebar */
    openSidebar: () => void;
    
    /** Close the sidebar */
    closeSidebar: () => void;
    
    /** Toggle sidebar open/close */
    toggleSidebar: () => void;
    
    /** Handle browser back button - prioritizes sidebar navigation */
    handleBrowserBack: () => boolean;
    
    /** Check if can go back */
    canGoBack: boolean;
}

export const SidebarNavigationContext = createContext<SidebarNavigationContextValue | undefined>(undefined);

export function SidebarNavigationProvider({ children }: { children: ReactNode }) {
    const [history, setHistory] = useState<SidebarNavigationItem[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
    const isHandlingHistoryRef = useRef<boolean>(false);

    const navigateToNode = useCallback((node: Node) => {
        const item: SidebarNavigationItem = {
            type: 'node',
            data: node,
            label: (node.data as { label?: string }).label || node.id,
        };
        
        setHistory([item]);
        setIsSidebarOpen(true);
        
        // Push a synthetic history entry for browser back button
        if (!isHandlingHistoryRef.current && typeof window !== 'undefined') {
            window.history.pushState({ sidebar: true }, '', window.location.href);
        }
    }, []);

    const navigateToEntity = useCallback((entity: AnyTrustFrameworkEntity, label?: string) => {
        const item: SidebarNavigationItem = {
            type: 'entity',
            data: entity,
            label: label || entity.id,
            entityType: entity.entityType as EntityType,
        };
        
        setHistory(prev => [...prev, item]);
    }, []);

    const goBack = useCallback(() => {
        setHistory(prev => {
            if (prev.length <= 1) return prev;
            return prev.slice(0, -1);
        });
    }, []);

    const navigateToHistoryItem = useCallback((index: number) => {
        setHistory(prev => {
            if (index < 0 || index >= prev.length) return prev;
            return prev.slice(0, index + 1);
        });
    }, []);

    const clearHistory = useCallback(() => {
        setHistory([]);
        setIsSidebarOpen(false);
    }, []);

    const openSidebar = useCallback(() => {
        setIsSidebarOpen(true);
        // Push a synthetic history entry for browser back button
        if (!isHandlingHistoryRef.current && typeof window !== 'undefined') {
            window.history.pushState({ sidebar: true }, '', window.location.href);
        }
    }, []);

    const closeSidebar = useCallback(() => {
        setIsSidebarOpen(false);
        setHistory([]);
    }, []);

    const toggleSidebar = useCallback(() => {
        if (isSidebarOpen) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }, [isSidebarOpen, closeSidebar, openSidebar]);

    const handleBrowserBack = useCallback((): boolean => {
        if (!isSidebarOpen) {
            return false; // Allow normal page navigation
        }

        if (history.length > 1) {
            // Navigate within sidebar
            goBack();
            return true; // Prevent page navigation
        } else {
            // Close sidebar and allow page navigation
            closeSidebar();
            return false; // Allow page navigation
        }
    }, [isSidebarOpen, history.length, goBack, closeSidebar]);

    const current = history.length > 0 ? history[history.length - 1] : null;
    const canGoBack = history.length > 1;

    const value: SidebarNavigationContextValue = {
        history,
        current,
        isSidebarOpen,
        navigateToNode,
        navigateToEntity,
        goBack,
        navigateToHistoryItem,
        clearHistory,
        openSidebar,
        closeSidebar,
        toggleSidebar,
        handleBrowserBack,
        canGoBack,
    };

    return (
        <SidebarNavigationContext.Provider value={value}>
            {children}
        </SidebarNavigationContext.Provider>
    );
}

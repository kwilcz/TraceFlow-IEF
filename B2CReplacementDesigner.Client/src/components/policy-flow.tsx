"use client";

import React, {useEffect, useMemo, useState, useRef, useCallback} from 'react';
import {useTheme} from '@/components/theme-provider';
import {LayoutTemplateIcon, Search, PanelRightClose, PanelRight} from "lucide-react";
import {ReactFlow, Background, Controls, ControlButton, Node, Edge} from '@xyflow/react';
import {GroupNode, ConditionedNode, StartNode, EndNode, CommentNode, CombinedSignInAndSignUpNode, ClaimsExchangeNode, GetClaimsNode, NODE_TYPES} from './nodeTypes';
import ConditionEdge from './edgeTypes/condition-edge';
import {useReactFlowState} from "@hooks/use-react-flow-state";
import {useLayout} from '@/hooks/use-layout';
import FlowContextMenu from '@components/flow-context-menu';
import FlowMiniMap from '@components/flow-minimap';
import FloatingPolicySearch from '@components/floating-policy-search';
import NodeDetailsSidebar from '@components/node-details-sidebar';
import { PolicySearchRef } from '@components/policy-search';
import { usePolicySearch } from '@hooks/use-policy-search';
import { useSidebarNavigation } from '@hooks/use-sidebar-navigation';

const edgeOptions = {
    animated: true,
    type: '',
    style: {
        strokeWidth: 2
    }
};

interface ContentProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    graph: { nodes: Node<any>[]; edges: Edge<any>[] };
    id: string;
}

const PolicyFlow: React.FC<ContentProps> = ({graph}) => {
    const {nodes: rfNodes, edges: rfEdges, setNodes, setEdges, onNodesChange, onEdgesChange} =
        useReactFlowState(graph.nodes, graph.edges);

    const applyLayout = useLayout();
    const {resolvedTheme} = useTheme();
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
    const [isSearchVisible, setIsSearchVisible] = useState<boolean>(false);
    const searchRef = useRef<PolicySearchRef>(null);
    const { clearSearch } = usePolicySearch();
    const { navigateToNode, isSidebarOpen, closeSidebar, toggleSidebar } = useSidebarNavigation();

    const closeSearch = useCallback(() => {
        setIsSearchVisible(false);
        clearSearch();
    }, [clearSearch]);

    const toggleSearch = () => {
        setIsSearchVisible(!isSearchVisible);
    };

    const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
        navigateToNode(node);
    }, [navigateToNode]);

    const nodeTypes = useMemo(() => ({
        [NODE_TYPES.GROUP]: GroupNode,
        [NODE_TYPES.CONDITIONED]: ConditionedNode,
        [NODE_TYPES.START]: StartNode,
        [NODE_TYPES.END]: EndNode,
        [NODE_TYPES.COMMENT]: CommentNode,
        [NODE_TYPES.COMBINED_SIGNIN_SIGNUP]: CombinedSignInAndSignUpNode,
        [NODE_TYPES.CLAIMS_EXCHANGE]: ClaimsExchangeNode,
        [NODE_TYPES.GET_CLAIMS]: GetClaimsNode,
    }), []);

    const edgeTypes = useMemo(() => ({
        'condition-edge': ConditionEdge
    }), []);

    useEffect(() => {
        if (!rfNodes || !rfEdges) return;

        setNodes(graph.nodes);
        setEdges(graph.edges);
    // Nodes & edges cannot be added to deps, only graph!
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [graph]);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // CTRL+F or CMD+F to open/focus search
            if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
                event.preventDefault();
                setIsSearchVisible(true);
                // Focus the search input, even if it's already visible
                setTimeout(() => {
                    searchRef.current?.focus();
                }, 0);
            }
            // ESC to close search
            if (event.key === 'Escape' && isSearchVisible) {
                closeSearch();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isSearchVisible, closeSearch]);

    const showContextMenu = (event: MouseEvent | React. MouseEvent<Element, MouseEvent>) => {
        event.preventDefault();
        setContextMenu({ x: event.clientX, y: event.clientY });
    };

    const hideContextMenu = () => setContextMenu(null);

    return (
        <div className="h-full flex rounded-md shadow-inner border border-opacity-5 overflow-hidden">
            <div className="flex-1 relative">
                <ReactFlow
                    nodes={rfNodes}
                    edges={rfEdges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={handleNodeClick}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    defaultEdgeOptions={edgeOptions}
                    elevateNodesOnSelect={false}
                    nodesDraggable={true}
                    nodesConnectable={false}
                    elementsSelectable={true}
                    minZoom={0.25}
                    colorMode={resolvedTheme}
                    onPaneContextMenu={showContextMenu}
                >
                    <Controls position="top-center" orientation="horizontal">
                        <ControlButton title="Search" onClick={toggleSearch}>
                            <Search strokeWidth="1" absoluteStrokeWidth/>
                        </ControlButton>
                        <ControlButton title="Reset Layout" onClick={applyLayout}>
                            <LayoutTemplateIcon strokeWidth="1" absoluteStrokeWidth/>
                        </ControlButton>
                        <ControlButton 
                            title={isSidebarOpen ? "Close Details" : "Open Details"} 
                            onClick={toggleSidebar}
                            className={isSidebarOpen ? "!bg-primary/20" : ""}
                        >
                            {isSidebarOpen ? (
                                <PanelRightClose strokeWidth="1" absoluteStrokeWidth/>
                            ) : (
                                <PanelRight strokeWidth="1" absoluteStrokeWidth/>
                            )}
                        </ControlButton>
                    </Controls>
                    <FlowMiniMap />
                    <Background/>
                    
                    {isSearchVisible && (
                        <FloatingPolicySearch 
                            ref={searchRef}
                            isVisible={isSearchVisible} 
                            onClose={closeSearch} 
                        />
                    )}

                </ReactFlow>
                {contextMenu && (
                    <FlowContextMenu
                        x={contextMenu.x}
                        y={contextMenu.y}
                        onHide={hideContextMenu}
                    />
                )}
            </div>
            <NodeDetailsSidebar 
                isOpen={isSidebarOpen}
                onClose={closeSidebar}
            />
        </div>
    );
};

export default PolicyFlow;
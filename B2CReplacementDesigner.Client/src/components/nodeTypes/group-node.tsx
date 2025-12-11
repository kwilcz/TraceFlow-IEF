// src/components/GroupNode.tsx
import React, {useEffect, useMemo} from "react";
import {Node, NodeProps, Position, useViewport, useNodes, useUpdateNodeInternals} from "@xyflow/react";
import useReactFlowStore from "@hooks/use-react-flow-store";
import {useNodeHighlight, getNodeHighlightClasses} from "@hooks/use-node-highlight";
import {ChevronDown, ChevronUp, ExpandIcon} from "lucide-react";
import PolicyNode from "./components/policy-node";
import {cn} from "@lib/utils";
import {GROUP_NODE_COLLAPSED_HEIGHT, GROUP_NODE_HEADER_HEIGHT} from "@/constants/node-layout";

export type GroupNode = Node<
    {
        label: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        details: any;
        isCollapsed: boolean;
    },
    "Group"
>;

const HEADER_HEIGHT = GROUP_NODE_HEADER_HEIGHT;
const COLLAPSED_HEIGHT = GROUP_NODE_COLLAPSED_HEIGHT;

export default function GroupNode(props: NodeProps<GroupNode>) {
    const toggleCollapse = useReactFlowStore((state) => state.toggleCollapse);
    const highlight = useNodeHighlight(props.id);
    const highlightClasses = getNodeHighlightClasses(highlight);
    const viewport = useViewport();
    const nodes = useNodes();
    const updateNodeInternals = useUpdateNodeInternals();

    const handleToggleCollapse = () => {
        toggleCollapse(props.id);
    };

    useEffect(() => {
        updateNodeInternals(props.id);

        if (typeof window === "undefined") {
            return;
        }

        const TRANSITION_BUFFER_MS = 200;
        const timeout = window.setTimeout(() => updateNodeInternals(props.id), TRANSITION_BUFFER_MS);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [props.id, props.data.isCollapsed, props.width, props.height, updateNodeInternals]);

    const nodeColor = useMemo(() => {
        const nodeColors = [
            "bg-green-900/50 border-green-500",
            "bg-blue-900/50 border-blue-500",
            "bg-purple-900/50 border-purple-500",
            "bg-red-900/50 border-red-500",
            "bg-yellow-900/50 border-yellow-500",
            "bg-pink-900/50 border-pink-500",
            "bg-teal-900/50 border-teal-500",
            "bg-indigo-900/50 border-indigo-500",
            "bg-orange-900/50 border-orange-500",
            "bg-cyan-900/50 border-cyan-500",
            "bg-lime-900/50 border-lime-500",
            "bg-amber-900/50 border-amber-500",
        ];
        const index = Math.abs(hashCode(props.id)) % nodeColors.length;
        return nodeColors[index];
    }, [props.id]);

    // Calculate nesting depth by traversing parent chain
    const depth = useMemo(() => {
        const calculateDepth = (nodeId: string): number => {
            const node = nodes.find((n) => n.id === nodeId);
            if (!node?.parentId) return 0;
            return 1 + calculateDepth(node.parentId);
        };
        return calculateDepth(props.id);
    }, [props.id, nodes]);

    // Calculate node position in screen coordinates
    const nodeScreenY = (props.positionAbsoluteY ?? 0) * viewport.zoom + viewport.y;
    const nodeScreenBottom = nodeScreenY + (props.height ?? 0) * viewport.zoom;

    // Only show header if node is at least partially visible
    const isVisible = nodeScreenBottom > 0;

    // Calculate sticky offset: how far the node top is scrolled above viewport
    const stickyOffset = Math.max(0, -nodeScreenY / viewport.zoom);

    // Only add depth-based offset when header is sticky (node is scrolled above viewport)
    const isSticky = nodeScreenY < 0;
    const headerOffset = stickyOffset + (isSticky ? depth * HEADER_HEIGHT : 0);

    const nodeStyle = {
        width: props.width,
        height: props.data.isCollapsed ? `${COLLAPSED_HEIGHT}px` : props.height,
    } as const;

    const nodeClassName = cn(
        "p-[18px] rounded border-[2px] shadow-lg transition-all duration-150",
        props.data.isCollapsed ? "h-auto" : "h-full",
        nodeColor,
        highlightClasses
    );

    return (
        <PolicyNode {...props} className={nodeClassName} elevation="lg" style={nodeStyle}>

            <div className="h-full w-full relative overflow-hidden rounded">
                {isVisible && (
                    <PolicyNode.Header
                        className={cn(
                            "backdrop-blur-md rounded border-2 space-x-3 p-2 gap-3",
                            nodeColor,
                        )}
                        style={{
                            position: "absolute",
                            top: `${headerOffset}px`,
                            left: 0,
                            right: 0,
                        }}
                    >
                        <PolicyNode.Icon className="mr-0 bg-transparent p-0 text-slate-300">
                            <ExpandIcon className="w-5 h-5" />
                        </PolicyNode.Icon>
                        <div className="overflow-hidden flex-1" title={props.data?.label}>
                            <PolicyNode.Title className="text-slate-100">
                                {props.data?.label}
                            </PolicyNode.Title>
                        </div>
                        <PolicyNode.ActionButton
                            onClick={handleToggleCollapse}
                            title={props.data.isCollapsed ? "Expand group" : "Collapse group"}
                        >
                            {props.data.isCollapsed ? (
                                <ChevronDown className="w-4 h-4" />
                            ) : (
                                <ChevronUp className="w-4 h-4" />
                            )}
                        </PolicyNode.ActionButton>
                    </PolicyNode.Header>
                )}
            </div>

            
            <PolicyNode.Handle type="target" position={Position.Top}/>
            <PolicyNode.Handle type="source" position={Position.Bottom} />
        </PolicyNode>
    );
}

function hashCode(id: string): number {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        const char = id.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash;
}


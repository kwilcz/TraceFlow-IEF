import React, { createContext, useContext, useMemo } from "react";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { useNodeHighlight, getNodeHighlightClasses } from "@hooks/use-node-highlight";
import { useTraceHighlight, getTraceHighlightClasses } from "@hooks/use-trace-highlight";
import { cn } from "@lib/utils"; // assuming existing utility
import { CheckCircle2, XCircle, SkipForward, Clock } from "lucide-react";

type BaseNode = Node<Record<string, unknown>, string>;

interface PolicyNodeContextValue {
    nodeProps: NodeProps<BaseNode>;
    searchHighlightClasses: string;
    traceHighlightClasses: string;
    hoverClasses: string;
    selectClasses: string;
    isSelected: boolean;
    isTraceModeActive: boolean;
    isActiveTraceStep: boolean;
    traceResult: import("@/types/trace").StepResult | null;
}

const PolicyNodeContext = createContext<PolicyNodeContextValue | null>(null);

function usePolicyNodeCtx(): PolicyNodeContextValue {
    const ctx = useContext(PolicyNodeContext);
    if (!ctx) throw new Error("PolicyNode subcomponent must be used within <PolicyNode>");
    return ctx;
}

interface PolicyNodeProps extends NodeProps<BaseNode> {
    className?: string;
    pattern?: boolean;
    children: React.ReactNode;
    elevation?: "sm" | "md" | "lg" | "none";
    style?: React.CSSProperties;
}

export function PolicyNode(props: PolicyNodeProps) {
    const { id, selected } = props;
    const highlight = useNodeHighlight(id);
    const traceHighlight = useTraceHighlight(id);
    const searchHighlightClasses = getNodeHighlightClasses(highlight);
    const traceHighlightClasses = getTraceHighlightClasses(traceHighlight);

    const elevation =
        props.elevation === "none"
            ? ""
            : props.elevation === "sm"
            ? "shadow"
            : props.elevation === "md"
            ? "shadow-md"
            : "shadow-lg";

    const hoverClasses = "hover:shadow-xl";

    // Select classes - consistent across all nodes
    const selectClasses = selected ? "ring-2 ring-indigo-400 shadow-indigo-500/40" : "";

    const containerClasses = useMemo(() => {
        return cn(
            "relative rounded border-2 transition-all duration-150 p-3 w-fit flex flex-col gap-4",
            elevation,
            hoverClasses,
            // Don't apply select classes in trace mode to avoid conflicts
            !traceHighlight.isTraceModeActive && selectClasses,
            searchHighlightClasses,
            traceHighlightClasses,
            props.pattern && "node-dot-pattern",
            props.className
        );
    }, [elevation, hoverClasses, selectClasses, searchHighlightClasses, traceHighlightClasses, traceHighlight.isTraceModeActive, props.pattern, props.className]);

    const ctx: PolicyNodeContextValue = useMemo(
        () => ({
            nodeProps: props,
            searchHighlightClasses,
            traceHighlightClasses,
            hoverClasses,
            selectClasses,
            isSelected: !!selected,
            isTraceModeActive: traceHighlight.isTraceModeActive,
            isActiveTraceStep: traceHighlight.isActiveStep,
            traceResult: traceHighlight.lastResult,
        }),
        [props, searchHighlightClasses, traceHighlightClasses, hoverClasses, selectClasses, selected, traceHighlight]
    );

    return (
        <PolicyNodeContext.Provider value={ctx}>
            <div className={containerClasses}>
                {/* Trace status indicator */}
                {traceHighlight.isTraceModeActive && traceHighlight.isVisited && (
                    <TraceStatusIndicator result={traceHighlight.lastResult} visitCount={traceHighlight.visitCount} />
                )}
                {props.children}
            </div>
        </PolicyNodeContext.Provider>
    );
}

/**
 * Trace status indicator component showing execution result.
 */
const TraceStatusIndicator: React.FC<{
    result: import("@/types/trace").StepResult | null;
    visitCount: number;
}> = React.memo(({ result, visitCount }) => {
    if (!result) return null;

    const iconMap = {
        Success: <CheckCircle2 className="w-4 h-4 text-green-500" />,
        Error: <XCircle className="w-4 h-4 text-red-500" />,
        Skipped: <SkipForward className="w-4 h-4 text-yellow-500" />,
        PendingInput: <Clock className="w-4 h-4 text-blue-500" />,
    };

    const bgMap = {
        Success: "bg-green-500/20 border-green-500/50",
        Error: "bg-red-500/20 border-red-500/50",
        Skipped: "bg-yellow-500/20 border-yellow-500/50",
        PendingInput: "bg-blue-500/20 border-blue-500/50",
    };

    return (
        <div
            className={cn(
                "absolute -top-3 -right-3 flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-semibold z-10",
                bgMap[result]
            )}
        >
            {iconMap[result]}
            {visitCount > 1 && <span className="text-slate-300">×{visitCount}</span>}
        </div>
    );
});
TraceStatusIndicator.displayName = "TraceStatusIndicator";

// ---------------- Subcomponents ----------------

const Header: React.FC<{
    children: React.ReactNode;
    sticky?: boolean;
    className?: string;
    style?: React.CSSProperties;
}> = React.memo(({ children, sticky, className, style }) => {
    return (
        <div
            className={cn("flex items-center gap-1", sticky && "sticky top-0", "min-h-[48px]", className)}
            style={style} // eslint-disable-line
        >
            {children}
        </div>
    );
});
Header.displayName = "PolicyNode.Header";

const Description: React.FC<{
    children: React.ReactNode;
    className?: string;
}> = React.memo(({ children, className }) => <div className={cn(`text-xs text-slate-500`, className)}>{children}</div>);
Description.displayName = "PolicyNode.Description";

const Title: React.FC<{ children: React.ReactNode; className?: string }> = React.memo(({ children, className }) => (
    <div className={cn("font-bold text-lg text-slate-100 truncate", className)} title={String(children)}>
        {children}
    </div>
));
Title.displayName = "PolicyNode.Title";

const SectionTitle: React.FC<{ children: React.ReactNode; className?: string }> = React.memo(
    ({ children, className }) => (
        <div className={cn("font-bold text-md text-slate-100 truncate", className)}>{children}</div>
    )
);
SectionTitle.displayName = "PolicyNode.SectionTitle";

const SubTitle: React.FC<{ children: React.ReactNode; className?: string }> = React.memo(({ children, className }) => (
    <div className={cn("text-xs text-slate-400 truncate", className)} title={String(children)}>
        {children}
    </div>
));
SubTitle.displayName = "PolicyNode.SubTitle";

const Icon: React.FC<{ children: React.ReactNode; className?: string }> = React.memo(({ children, className }) => (
    <div className={cn(`mr-2 p-2 rounded-md`, className)}>{children}</div>
));
Icon.displayName = "PolicyNode.Icon";

const Content: React.FC<{ children: React.ReactNode; className?: string }> = React.memo(({ children, className }) => (
    <div className={cn("text-xs text-slate-200 space-y-2", className)}>{children}</div>
));
Content.displayName = "PolicyNode.Content";

const Footer: React.FC<{ children: React.ReactNode; className?: string }> = React.memo(({ children, className }) => (
    <div className={cn("mt-2 pt-2 border-t border-slate-500/40 text-[10px] text-slate-400", className)}>{children}</div>
));
Footer.displayName = "PolicyNode.Footer";

const Divider: React.FC<{ className?: string }> = React.memo(({ className }) => (
    <div className={cn("border-t border-slate-600/40 my-2", className)} />
));
Divider.displayName = "PolicyNode.Divider";

interface HandleProps {
    type: "source" | "target";
    id?: string;
    position?: Position;
    leftOffset?: string;
    color?: string; // tailwind color override
    className?: string;
}

const NodeHandle: React.FC<HandleProps> = React.memo(
    ({ type, id, position = Position.Bottom, leftOffset, color, className }) => {
        const { nodeProps } = usePolicyNodeCtx();

        if (!id) {
            id = `${nodeProps.id}-${type}`;
        }

        const style = leftOffset ? { left: leftOffset } : undefined;
        const colorClass = color ? `bg-${color}-500` : "bg-slate-500";
        return (
            <Handle
                type={type}
                id={id}
                position={position}
                className={cn("!w-3 !h-3", colorClass, className)}
                style={style}
            />
        );
    }
);
NodeHandle.displayName = "PolicyNode.Handle";

const Badge: React.FC<{
    children: React.ReactNode;
    className?: string;
    tone?: "info" | "warn" | "danger" | "neutral";
    sticky?: boolean;
}> = React.memo(({ children, className, tone = "neutral", sticky = false }) => {
    const toneMap: Record<string, string> = {
        info: "bg-cyan-700/60 text-cyan-100",
        warn: "bg-amber-700/60 text-amber-100",
        danger: "bg-red-700/60 text-red-100",
        neutral: "bg-slate-700/60 text-slate-200",
    };
    return (
        <span
            className={cn(
                "shadow px-2 py-0.5 rounded text-[10px] font-semibold",
                sticky && "absolute -top-3 right-2",
                toneMap[tone],
                className
            )}
        >
            {children}
        </span>
    );
});
Badge.displayName = "PolicyNode.Badge";

const Section: React.FC<{ children: React.ReactNode; className?: string }> = React.memo(({ children, className }) => (
    <div className={cn("rounded p-2 bg-slate-800/30 space-y-1 shadow", className)}>{children}</div>
));
Section.displayName = "PolicyNode.Section";

interface ActionsProps {
    children: React.ReactNode;
    className?: string;
    position?: "top-right" | "bottom-right" | "top-left" | "bottom-left";
}

const Actions: React.FC<ActionsProps> = React.memo(({ children, className, position = "top-right" }) => {
    const positionMap: Record<string, string> = {
        "top-right": "absolute top-2 right-2",
        "bottom-right": "absolute bottom-2 right-2",
        "top-left": "absolute top-2 left-2",
        "bottom-left": "absolute bottom-2 left-2",
    };
    return <div className={cn("flex gap-1 z-20", positionMap[position], className)}>{children}</div>;
});
Actions.displayName = "PolicyNode.Actions";

interface ActionButtonProps {
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
    title?: string;
}

const ActionButton: React.FC<ActionButtonProps> = React.memo(({ onClick, children, className, title }) => (
    <button
        onClick={onClick}
        className={cn(
            "w-6 h-6 rounded bg-slate-700/50 hover:bg-slate-600/70 text-slate-300 hover:text-slate-100 transition-colors flex items-center justify-center text-xs",
            className
        )}
        title={title}
    >
        {children}
    </button>
));
ActionButton.displayName = "PolicyNode.ActionButton";

// Compound assignment for dot-notation
PolicyNode.Header = Header;
PolicyNode.Title = Title;
PolicyNode.SubTitle = SubTitle;
PolicyNode.SectionTitle = SectionTitle;
PolicyNode.Description = Description;
PolicyNode.Icon = Icon;
PolicyNode.Content = Content;
PolicyNode.Footer = Footer;
PolicyNode.Divider = Divider;
PolicyNode.Handle = NodeHandle;
PolicyNode.Badge = Badge;
PolicyNode.Section = Section;
PolicyNode.Actions = Actions;
PolicyNode.ActionButton = ActionButton;

export default PolicyNode;

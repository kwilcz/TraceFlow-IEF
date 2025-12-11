import React from "react";
import { CaretLeft, CaretRight, X } from "@phosphor-icons/react";
import { NodeDetailsContent } from "@/components/node-details";
import { useSidebarNavigation } from "@/hooks/use-sidebar-navigation";

interface NodeDetailsSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const NodeDetailsSidebar: React.FC<NodeDetailsSidebarProps> = ({ isOpen, onClose }) => {
    const { current, history, goBack, navigateToHistoryItem, canGoBack } = useSidebarNavigation();

    if (!isOpen || !current) {
        return null;
    }

    return (
        <div className="w-96 bg-background border-l border-border shadow-2xl flex flex-col h-full overflow-hidden">
            <div className="flex-shrink-0 border-b border-border">
                <div className="flex items-center justify-between p-4">
                    <h2 className="text-lg font-semibold">Details</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-md hover:bg-accent transition-colors"
                        aria-label="Close sidebar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {history.length > 0 && (
                    <div className="px-4 pb-3 flex items-center gap-1 overflow-x-auto">
                        {history.map((item, index) => (
                            <React.Fragment key={index}>
                                {index > 0 && <CaretRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                                <button
                                    onClick={() => navigateToHistoryItem(index)}
                                    className={`text-xs px-2 py-1 rounded transition-colors whitespace-nowrap ${
                                        index === history.length - 1
                                            ? "bg-primary/20 text-primary font-semibold"
                                            : "hover:bg-accent text-muted-foreground"
                                    }`}
                                    disabled={index === history.length - 1}
                                >
                                    {item.type === "node" ? "🔷 " : ""}
                                    {item.label}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                )}
            </div>

            {canGoBack && (
                <div className="px-4 pt-3 pb-2 flex-shrink-0">
                    <button
                        onClick={goBack}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <CaretLeft className="w-4 h-4" />
                        Back
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto">
                <div className="p-4 sidebar-slide-in">
                    <NodeDetailsContent item={current} />
                </div>
            </div>
        </div>
    );
};
export { ClickableReference } from "@/components/node-details";
export default NodeDetailsSidebar;

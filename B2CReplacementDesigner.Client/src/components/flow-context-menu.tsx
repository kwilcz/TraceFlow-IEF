import React from "react";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import useReactFlowStore from "@hooks/use-react-flow-store";
import {NodeChange, useReactFlow} from "@xyflow/react";
import {NODE_TYPES} from "@components/nodeTypes";

interface FlowContextMenuProps {
    x: number;
    y: number;
    onHide: () => void;
}

const FlowContextMenu: React.FC<FlowContextMenuProps> = ({x, y, onHide}) => {
    const {onNodesChange} = useReactFlowStore();
    const reactFlow = useReactFlow();

    function randomId() {
        return Math.random().toString(36).substring(7);
    }

    const handleAddCommentNode = () => {
        const nodePosition = reactFlow.screenToFlowPosition({x, y});
        
        const nodeChange: NodeChange[] = [{
            type: "add",
            item: {
                id: "comment-node-" + randomId(),
                type: NODE_TYPES.COMMENT,
                position: nodePosition,
                data: {
                    label: ""
                }
            }
        }];
        
        onNodesChange(nodeChange);
    }

    return (
        <DropdownMenu open onOpenChange={(isOpen: boolean) => !isOpen && onHide()}>
            <DropdownMenuTrigger asChild>
                <div style={{position: "absolute", top: y, left: x, width: 0, height: 0}} id={"test123"}/>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuLabel>Add Nodes</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleAddCommentNode}>Comment Node</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default FlowContextMenu;

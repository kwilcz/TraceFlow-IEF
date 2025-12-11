import React from 'react';
import {Node, NodeProps, NodeChange} from "@xyflow/react";
import {XIcon} from 'lucide-react';
import useReactFlowStore from "@hooks/use-react-flow-store";
import { useNodeHighlight, getNodeHighlightClasses } from '@hooks/use-node-highlight';

export type CommentNode = Node<
    {
        label: string;
    },
    'CommentNode'
>;

export default function CommentNode(props: NodeProps<CommentNode>) {
    const {onNodesChange} = useReactFlowStore();
    const highlight = useNodeHighlight(props.id);
    const highlightClasses = getNodeHighlightClasses(highlight);

    const autoResize = (textarea: HTMLTextAreaElement) => {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
        props.data.label = textarea.value;
    };

    const handleClose = () => {
        const changes: NodeChange = {
            type: 'remove',
            id: props.id
        }

        onNodesChange([changes]);
    };

    return (
        <div className={`inline-block bg-amber-200 box-border overflow-auto shadow-lg rounded-md ${highlightClasses}`}>
            {/* Header with drag area and close button */}
            <div className="flex justify-between bg-amber-300 items-center p-2 rounded-t-md cursor-move">
                <div></div> {/* Drag area */}
                <XIcon className="text-gray-800 hover:text-red-600 rounded-md" size="16" onClick={handleClose}/>
            </div>

            <div className={"p-4 nodrag"}>
                <textarea
                    className="bg-transparent border-none outline-none w-full h-full resize-none"
                    placeholder="Enter your note..."
                    onInput={(e) => autoResize(e.target as HTMLTextAreaElement)}
                    defaultValue={props.data.label}
                />
            </div>
        </div>
    );
}

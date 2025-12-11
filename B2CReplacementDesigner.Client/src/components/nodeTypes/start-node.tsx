import React from 'react';
import {Handle, Node, NodeProps, Position} from "@xyflow/react";
import { PlusCircle as CirclePlus } from '@phosphor-icons/react'
import { useNodeHighlight, getNodeHighlightClasses } from '@hooks/use-node-highlight';

export type StartNode = Node<
    Record<string, never>,
    'StartNode'
>;

export default function StartNode(props: NodeProps<StartNode>) {
    const highlight = useNodeHighlight(props.id);
    const highlightClasses = getNodeHighlightClasses(highlight);
    
    return (
        <div className={highlightClasses}>
            <CirclePlus className='stroke-emerald-600' size={36}/>
            <Handle className='opacity-0' type="source" position={Position.Bottom}/>
        </div>
    );
}

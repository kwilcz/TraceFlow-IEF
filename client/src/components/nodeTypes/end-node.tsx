import React from 'react';
import {Handle, Node, NodeProps, Position} from "@xyflow/react";
import { MinusCircle as CircleMinus } from '@phosphor-icons/react'
import { useNodeHighlight, getNodeHighlightClasses } from '@hooks/use-node-highlight';

export type EndNode = Node<
    Record<string, never>,
    'EndNode'
>;

export default function EndNode(props: NodeProps<EndNode>) {
    const highlight = useNodeHighlight(props.id, 'EndNode');
    const highlightClasses = getNodeHighlightClasses(highlight);
    
    return (
        <div className={`relative ${highlightClasses}`}>
            {highlight.isEndNodeHighlighted && (
                <div className="absolute inset-0 bg-yellow-300 rounded-full opacity-50 animate-ping" />
            )}
            <CircleMinus 
                className={`${highlight.isEndNodeHighlighted ? 'stroke-red-900' : 'stroke-red-700'} relative z-10`} 
                size={36}
            />
            <Handle className='opacity-0' type="target" position={Position.Top}/>
        </div>
    );
}

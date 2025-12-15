import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, EdgeProps } from '@xyflow/react';

const ConditionEdge: React.FC<EdgeProps> = (props) => {
    const {
        id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
        style = {}, markerEnd, data
    } = props;

    const label = (data as { label?: string })?.label;

    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition,
    });

    // Determine edge color based on condition
    const edgeStyle = {
        ...style,
        stroke: label === 'true' ? '#22c55e' : label === 'false' ? '#ef4444' : style.stroke || '#737373',
        strokeWidth: style.strokeWidth || 2,
    };

    return (
        <>
            <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} id={id} />
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'none',
                        zIndex: 1000,
                    }}
                    className="nodrag nopan"
                >
                    {label && (
                        <div className={`px-2 py-0.5 text-xs rounded-full font-semibold z-[1001] ${
                            label === 'true' ? 'bg-green-500/80 text-white' : 'bg-red-500/80 text-white'
                        }`}>
                            {label}
                        </div>
                    )}
                </div>
            </EdgeLabelRenderer>
        </>
    );
};

export default ConditionEdge;
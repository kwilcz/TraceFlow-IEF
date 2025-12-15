import {clsx, type ClassValue} from "clsx"
import {twMerge} from "tailwind-merge"
import {Edge} from "@xyflow/react";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function ensureArray<T>(obj?: T | T[]): T[] {
    return obj ? (Array.isArray(obj) ? obj : [obj]) : [];
}

/**
 * Performs a topological sort on the given edges based on their source nodes.
 * Forces `true` edges to be sorted after their corresponding `false` edges.
 *
 * @param {Edge[]} edges - The edges to be sorted.
 * @returns {Edge[]} - The sorted edges.
 */
export function sortEdgesTopologically(edges: Edge[]): Edge[] {
    const graph = new Map<string, Set<string>>();
    const inDegrees = new Map<string, number>();

    // Build the graph and calculate in-degrees
    edges.forEach(edge => {
        if (edge.sourceHandle) {
            graph.set(edge.source, graph.get(edge.source) || new Set());
            inDegrees.set(edge.id, inDegrees.get(edge.id) || 0);

            // If the edge's sourceHandle is "true", find the corresponding "false" edge
            if (edge.sourceHandle === "true") {
                const falseEdge = edges.find(e => e.source === edge.source && e.sourceHandle === "false");
                if (falseEdge) {
                    graph.get(edge.source)!.add(edge.id);
                    inDegrees.set(edge.id, (inDegrees.get(edge.id) || 0) + 1);
                }
            }
        }
    });

    // Initialize the queue with edges that have no incoming edges (in-degree of 0)
    const queue: string[] = [];
    inDegrees.forEach((degree, edgeId) => {
        if (degree === 0) queue.push(edgeId);
    });

    const sortedEdges: Edge[] = [];
    while (queue.length > 0) {
        const edgeId = queue.shift()!;
        const edge = edges.find(e => e.id === edgeId);
        if (edge) sortedEdges.push(edge);

        // Decrease the in-degree of neighboring edges and add them to the queue if their in-degree becomes 0
        graph.get(edge?.source || '')?.forEach(neighborId => {
            inDegrees.set(neighborId, (inDegrees.get(neighborId) || 0) - 1);
            if (inDegrees.get(neighborId) === 0) queue.push(neighborId);
        });
    }

    // Add any remaining edges that were not part of the topological sort
    return [...sortedEdges, ...edges.filter(edge => !sortedEdges.includes(edge))];
}

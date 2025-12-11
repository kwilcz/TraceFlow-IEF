// Types for node-specific data structures
export interface ConditionedNodeData {
    label: string;
    /** Reference to a claim type id used in the condition (if any) */
    claimTypeReferenceId?: string;
    /** Operator type string (e.g. ClaimsExist, ClaimEquals) */
    operatorType?: string;
    /** Optional condition value (for equality checks) */
    conditionValue?: string;
    /** Action configured on the precondition (if any) */
    action?: string;
    /** Whether to execute actions when the condition matches */
    executeActionsIf?: boolean;
    /** Any additional details from the source (kept generic for now) */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details?: any;

    // Allow additional arbitrary properties so nodes fit Node<T> constraints
    [key: string]: unknown;
}

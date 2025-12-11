/**
 * Node type constants for ReactFlow nodes
 * 
 * These constants prevent minification issues in production builds.
 * Using Component.name gets minified (e.g., "ClaimsExchangeNode" becomes "eI"),
 * which breaks type checking in switch statements.
 */

export const NODE_TYPES = {
    CLAIMS_EXCHANGE: 'ClaimsExchangeNode',
    GROUP: 'Group',
    CONDITIONED: 'Conditioned',
    COMMENT: 'Comment',
    COMBINED_SIGNIN_SIGNUP: 'CombinedSignInAndSignUp',
    START: 'Start',
    END: 'End',
    GET_CLAIMS: 'GetClaimsNode',
} as const;

export type NodeType = typeof NODE_TYPES[keyof typeof NODE_TYPES];

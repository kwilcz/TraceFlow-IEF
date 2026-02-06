import {
  ClaimsExchangeNode,
  CombinedSignInAndSignUpNode,
  CommentNode,
  ConditionedNode,
  EndNode,
  GetClaimsNode,
  GroupNode,
  NODE_TYPES,
  StartNode,
} from '@/components/nodeTypes';

export const POLICY_NODE_TYPES = {
  [NODE_TYPES.GROUP]: GroupNode,
  [NODE_TYPES.CONDITIONED]: ConditionedNode,
  [NODE_TYPES.START]: StartNode,
  [NODE_TYPES.END]: EndNode,
  [NODE_TYPES.COMMENT]: CommentNode,
  [NODE_TYPES.COMBINED_SIGNIN_SIGNUP]: CombinedSignInAndSignUpNode,
  [NODE_TYPES.CLAIMS_EXCHANGE]: ClaimsExchangeNode,
  [NODE_TYPES.GET_CLAIMS]: GetClaimsNode,
} as const;

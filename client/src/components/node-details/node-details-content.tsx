import React from "react";
import type { Node } from "@xyflow/react";
import type { SidebarNavigationItem } from "@/contexts/SidebarNavigationContext";
import type { AnyTrustFrameworkEntity } from "@/types/trust-framework-entities";
import ClaimDetailsView from "@/components/entity-details/ClaimDetailsView";
import ClaimsTransformationView from "@/components/entity-details/ClaimsTransformationView";
import { NODE_TYPES } from "../nodeTypes";
import { GenericEntityView, TechnicalProfileDetails } from "./entity-views";
import {
    ClaimsExchangeDetails,
    GroupDetails,
    ConditionedDetails,
    CommentDetails,
    CombinedSignInSignUpDetails,
    SimpleNodeDetails,
    GenericNodeDetails,
} from "./node-views";
import { GetClaimsDetails } from "./node-views/get-claims-details";

interface NodeDetailsContentProps {
    item: SidebarNavigationItem;
}

const NodeDetailsContent: React.FC<NodeDetailsContentProps> = ({ item }) => {
    if (item.type === "node") {
        return <NodeContentRenderer node={item.data as Node} />;
    }

    if (item.type === "entity") {
        return <EntityContentRenderer entity={item.data as AnyTrustFrameworkEntity} />;
    }

    return <div>Unknown content type</div>;
};

const EntityContentRenderer: React.FC<{ entity: AnyTrustFrameworkEntity }> = ({ entity }) => {
    switch (entity.entityType) {
        case "ClaimType":
            return <ClaimDetailsView claim={entity} />;
        case "TechnicalProfile":
            return <TechnicalProfileDetails profile={entity} />;
        case "ClaimsTransformation":
            return <ClaimsTransformationView transformation={entity} />;
        case "DisplayControl":
            return <div>DisplayControl view - Coming soon</div>;
        default:
            return <GenericEntityView entity={entity} />;
    }
};

const NodeContentRenderer: React.FC<{ node: Node }> = ({ node }) => {
    switch (node.type) {
        case NODE_TYPES.CLAIMS_EXCHANGE:
            return <ClaimsExchangeDetails node={node} />;
        case NODE_TYPES.GET_CLAIMS:
            return <GetClaimsDetails node={node} />;
        case NODE_TYPES.GROUP:
            return <GroupDetails node={node} />;
        case NODE_TYPES.CONDITIONED:
            return <ConditionedDetails node={node} />;
        case NODE_TYPES.COMMENT:
            return <CommentDetails node={node} />;
        case NODE_TYPES.COMBINED_SIGNIN_SIGNUP:
            return <CombinedSignInSignUpDetails node={node} />;
        case NODE_TYPES.START:
        case NODE_TYPES.END:
            return <SimpleNodeDetails node={node} />;
        default:
            return <GenericNodeDetails node={node} />;
    }
};

export default NodeDetailsContent;

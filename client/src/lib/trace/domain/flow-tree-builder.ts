import type {
    FlowNode,
    FlowNodeContext,
    FlowNodeChild,
    StepFlowData,
    TechnicalProfileFlowData,
    ClaimsTransformationFlowData,
    HomeRealmDiscoveryFlowData,
    DisplayControlFlowData,
    SendClaimsFlowData,
} from "@/types/flow-node";
import { FlowNodeType } from "@/types/flow-node";

/**
 * Builds a FlowNode tree during pipeline processing.
 *
 * Called by ResultApplicator in response to createStep, pushSubJourney,
 * popSubJourney, and finalizeStep events. Maintains an internal cursor
 * (the "current" node) that tracks insertion point.
 *
 * The JourneyStack handles the parsing state; this builder captures
 * the structural hierarchy as a tree of FlowNodes.
 */
export class FlowTreeBuilder {
    private root: FlowNode;
    private stack: FlowNode[];  // ancestry from root to current

    constructor() {
        this.root = FlowTreeBuilder.createRootNode();
        this.stack = [this.root];
    }

    /** Returns the built tree. */
    getTree(): FlowNode {
        return this.root;
    }

    /** The currently active node (where new children are inserted). */
    get current(): FlowNode {
        return this.stack[this.stack.length - 1];
    }

    /**
     * Push a new SubJourney as a child of the current node.
     * Called when ResultApplicator processes `pushSubJourney`.
     */
    pushSubJourney(journeyId: string, journeyName: string, orchStep: number, context: FlowNodeContext): void {
        const sjNode: FlowNode = {
            id: `sj-${journeyId}`,
            name: journeyName || journeyId,
            type: FlowNodeType.SubJourney,
            triggeredAtStep: orchStep,
            lastStep: orchStep,
            children: [],
            data: { type: FlowNodeType.SubJourney, journeyId },
            context,
        };
        this.current.children.push(sjNode);
        this.stack.push(sjNode);
    }

    /**
     * Pop the current SubJourney — ascend to parent.
     * Called when ResultApplicator processes `popSubJourney`.
     */
    popSubJourney(): void {
        if (this.stack.length > 1) {
            this.stack.pop();
        }
    }

    /**
     * Add a step node as a child of the current node.
     * Called when a step is finalized and added to traceSteps[].
     * Returns the created FlowNode so callers can attach children.
     */
    addStep(data: StepFlowData, context: FlowNodeContext): FlowNode {
        const journeyId = this.current.data.type === FlowNodeType.SubJourney
            ? this.current.data.journeyId
            : this.current.data.type === FlowNodeType.Root
                ? this.current.id
                : "unknown";

        const stepNode: FlowNode = {
            id: `step-${journeyId}-${data.stepOrder}`,
            name: `Step ${data.stepOrder}`,
            type: FlowNodeType.Step,
            triggeredAtStep: data.stepOrder,
            lastStep: data.stepOrder,
            children: [],
            data,
            context,
        };

        this.current.children.push(stepNode);
        this.updateLastStep(data.stepOrder);
        return stepNode;
    }

    /**
     * Add a TechnicalProfile child node to a parent FlowNode.
     * Returns the created node so callers can nest ClaimsTransformation or validation TP children.
     */
    addTechnicalProfile(parent: FlowNode, data: TechnicalProfileFlowData, context: FlowNodeContext): FlowNode {
        const tpNode: FlowNode = {
            id: `tp-${data.technicalProfileId}`,
            name: data.technicalProfileId,
            type: FlowNodeType.TechnicalProfile,
            triggeredAtStep: parent.triggeredAtStep,
            lastStep: parent.triggeredAtStep,
            children: [],
            data,
            context,
        };
        parent.children.push(tpNode);
        return tpNode;
    }

    /**
     * Add a ClaimsTransformation child node to a parent FlowNode.
     */
    addClaimsTransformation(parent: FlowNode, data: ClaimsTransformationFlowData, context: FlowNodeContext): void {
        const ctNode: FlowNode = {
            id: `ct-${data.transformationId}`,
            name: data.transformationId,
            type: FlowNodeType.ClaimsTransformation,
            triggeredAtStep: parent.triggeredAtStep,
            lastStep: parent.triggeredAtStep,
            children: [],
            data,
            context,
        };
        parent.children.push(ctNode);
    }

    /**
     * Add a HomeRealmDiscovery child node to a parent FlowNode.
     */
    addHomeRealmDiscovery(parent: FlowNode, data: HomeRealmDiscoveryFlowData, context: FlowNodeContext): void {
        const hrdNode: FlowNode = {
            id: `hrd-${parent.id}`,
            name: "Home Realm Discovery",
            type: FlowNodeType.HomeRealmDiscovery,
            triggeredAtStep: parent.triggeredAtStep,
            lastStep: parent.triggeredAtStep,
            children: [],
            data,
            context,
        };
        parent.children.push(hrdNode);
    }

    /**
     * Add a DisplayControl child node to a parent FlowNode.
     * Returns the created node so callers can nest TP children.
     */
    addDisplayControl(parent: FlowNode, data: DisplayControlFlowData, context: FlowNodeContext): FlowNode {
        const dcNode: FlowNode = {
            id: `dc-${data.displayControlId}-${data.action}`,
            name: `${data.displayControlId}:${data.action}`,
            type: FlowNodeType.DisplayControl,
            triggeredAtStep: parent.triggeredAtStep,
            lastStep: parent.triggeredAtStep,
            children: [],
            data,
            context,
        };
        parent.children.push(dcNode);
        return dcNode;
    }

    /**
     * Add a SendClaims child node to a parent FlowNode.
     * Returns the created node.
     */
    addSendClaims(parent: FlowNode, data: SendClaimsFlowData, context: FlowNodeContext): FlowNode {
        const node: FlowNode = {
            id: `sc-${data.technicalProfileId}`,
            name: `SendClaims: ${data.technicalProfileId}`,
            type: FlowNodeType.SendClaims,
            triggeredAtStep: parent.triggeredAtStep,
            lastStep: parent.triggeredAtStep,
            children: [],
            data,
            context,
        };
        parent.children.push(node);
        return node;
    }

    /**
     * Recursively converts FlowNodeChild[] into FlowNode children on a parent.
     * Called by StepLifecycleManager when a step is finalized.
     */
    attachChildren(parent: FlowNode, children: FlowNodeChild[], context: FlowNodeContext): void {
        for (const child of children) {
            let node: FlowNode;
            switch (child.data.type) {
                case FlowNodeType.TechnicalProfile:
                    node = this.addTechnicalProfile(parent, child.data, context);
                    break;
                case FlowNodeType.ClaimsTransformation:
                    this.addClaimsTransformation(parent, child.data, context);
                    continue; // CT has no children
                case FlowNodeType.HomeRealmDiscovery:
                    this.addHomeRealmDiscovery(parent, child.data, context);
                    continue;
                case FlowNodeType.DisplayControl:
                    node = this.addDisplayControl(parent, child.data, context);
                    break;
                case FlowNodeType.SendClaims:
                    node = this.addSendClaims(parent, child.data, context);
                    break;
                default:
                    continue;
            }
            if (child.children?.length) {
                this.attachChildren(node, child.children, context);
            }
        }
    }

    /**
     * Resets the builder for a new session/flow.
     */
    reset(): void {
        this.root = FlowTreeBuilder.createRootNode();
        this.stack = [this.root];
    }

    /**
     * Updates the root node's name and policy data.
     * Called when the main journey ID is discovered during parsing.
     */
    setRootInfo(journeyName: string, policyId: string): void {
        // FlowNode fields are readonly for consumers but we own the object
        (this.root as { name: string }).name = journeyName;
        (this.root.data as { policyId: string }).policyId = policyId;
    }

    // --- internal ---

    private updateLastStep(orchStep: number): void {
        for (let i = this.stack.length - 1; i >= 0; i--) {
            if (this.stack[i].lastStep < orchStep) {
                this.stack[i].lastStep = orchStep;
            }
        }
    }

    private static createRootNode(): FlowNode {
        return {
            id: "root",
            name: "UserJourney",
            type: FlowNodeType.Root,
            triggeredAtStep: 0,
            lastStep: 0,
            children: [],
            data: { type: FlowNodeType.Root, policyId: "" },
            context: {
                timestamp: new Date(0),
                sequenceNumber: 0,
                logId: "",
                eventType: "",
                statebagSnapshot: {},
                claimsSnapshot: {},
            },
        };
    }
}

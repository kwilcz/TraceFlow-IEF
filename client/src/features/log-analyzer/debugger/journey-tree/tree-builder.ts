import type { TraceStep } from "@/types/trace";
import type { TreeNode } from "../types";

// ============================================================================
// Tree Builder — Pure Functions
// ============================================================================
// Mechanically extracted from `trace-timeline.tsx` lines ~250-590.
// No UI dependencies — takes TraceStep[] and returns TreeNode[].
// ============================================================================

/**
 * Builds the full tree structure from an array of trace steps.
 *
 * Steps are grouped by `journeyContextId`. If there is a single main
 * journey the steps appear at the root level; otherwise each sub-journey
 * becomes a collapsible group node.
 */
export function buildTreeStructure(traceSteps: TraceStep[]): TreeNode[] {
    if (traceSteps.length === 0) return [];

    // Group by SubJourney
    const subJourneyMap = new Map<string, TraceStep[]>();

    for (const step of traceSteps) {
        const journeyId = step.journeyContextId || "MainJourney";
        if (!subJourneyMap.has(journeyId)) {
            subJourneyMap.set(journeyId, []);
        }
        subJourneyMap.get(journeyId)!.push(step);
    }

    const children: TreeNode[] = [];
    const entries = Array.from(subJourneyMap.entries());

    for (const [journeyId, steps] of entries) {
        // Check if this is the main journey or a subjourney
        const isMainJourney = journeyId === "MainJourney" || steps.every((s) => !s.subJourneyId);

        if (entries.length === 1 && isMainJourney) {
            // Single journey — step nodes are direct children of root userjourney
            for (const step of steps) {
                children.push(buildStepNode(step, step.sequenceNumber));
            }
        } else {
            // Multiple journeys or explicit subjourney — wrap in subjourney node
            const journeyNode: TreeNode = {
                id: `journey-${journeyId}`,
                label: journeyId,
                type: "subjourney",
                metadata: {
                    tpCount: steps.reduce((sum, s) => sum + s.technicalProfiles.length, 0),
                    result: steps.some((s) => s.result === "Error") ? "Error" : "Success",
                },
                children: steps.map((s) => buildStepNode(s, s.sequenceNumber)),
            };
            children.push(journeyNode);
        }
    }

    // Always create root UserJourney node (ISS-004)
    // BUG: When multiple journey groups exist, the main journey's steps are
    // wrapped in a "subjourney" node that shares the same label as the root
    // "userjourney" node, producing double-nesting:
    //   UserJourney → UserJourney → steps   (wrong)
    //                 SubJourney  → steps
    // Expected:
    //   UserJourney → steps (flat, main journey)
    //                 SubJourney → steps
    // Fix: main-journey steps should be direct children of root, only actual
    // sub-journeys should be wrapped in subjourney group nodes.
    const journeyName = traceSteps[0].currentJourneyName || entries[0][0];
    const rootNode: TreeNode = {
        id: `userjourney-${entries[0][0]}`,
        label: journeyName,
        type: "userjourney",
        metadata: {
            tpCount: traceSteps.reduce((sum, s) => sum + s.technicalProfiles.length, 0),
            result: traceSteps.some((s) => s.result === "Error") ? "Error" : "Success",
        },
        children,
    };

    return [rootNode];
}

/**
 * Detects whether a step should emit an HRD (Home Realm Discovery) node.
 *
 * A step qualifies when it is interactive, offers multiple options, and its
 * action handler indicates HomeRealmDiscovery behavior.
 */
function isHomeRealmDiscoveryStep(step: TraceStep): boolean {
    return (
        step.isInteractiveStep &&
        step.selectableOptions.length > 1 &&
        (step.actionHandler?.includes("HomeRealmDiscovery") ?? false)
    );
}

/**
 * Builds the synthetic HRD node shown when an interactive step exposes
 * multiple selectable options and uses HomeRealmDiscovery routing.
 *
 * This node is intentionally inserted before all TP/DC content so the
 * decision point is visually prominent in the step tree.
 */
function buildHrdNode(seq: number, stepIndex: number, step: TraceStep): TreeNode {
    return {
        id: `hrd-${seq}`,
        label: "HomeRealmDiscovery",
        type: "hrd",
        stepIndex,
        metadata: {
            isHrdSelection: true,
            selectableOptions: step.selectableOptions,
            selectedOption: step.selectedOption,
            isInteractive: true,
        },
    };
}

/**
 * Creates a lookup from Technical Profile id to Claims Transformation ids
 * based on `technicalProfileDetails`.
 *
 * This normalization supports ownership assignment in later phases, where
 * CTs are attached under the most specific parent that claims them.
 */
function createTpToCtsMap(step: TraceStep): Map<string, string[]> {
    const tpToCts = new Map<string, string[]>();

    if (!step.technicalProfileDetails) {
        return tpToCts;
    }

    for (const detail of step.technicalProfileDetails) {
        if (detail.claimsTransformations?.length) {
            tpToCts.set(detail.id, detail.claimsTransformations.map((ct) => ct.id));
        }
    }

    return tpToCts;
}

/**
 * Phase 1 ownership pass.
 *
 * Builds DisplayControl nodes and marks their owned entities in `owned`:
 * - owned TP ids
 * - owned CT ids (from both inline action data and TP details mapping)
 *
 * This prevents duplicate CT/TP rendering in later passes.
 */
function buildDisplayControlNodes(params: {
    step: TraceStep;
    seq: number;
    stepIndex: number;
    getCtsForTp: (tpId: string) => string[];
    owned: Set<string>;
}): TreeNode[] {
    const { step, seq, stepIndex, getCtsForTp, owned } = params;
    const dcNodes: TreeNode[] = [];

    for (const dcAction of step.displayControlActions) {
        const dcLabel = dcAction.action
            ? `${dcAction.displayControlId} → ${dcAction.action}`
            : dcAction.displayControlId;
        const dcChildren: TreeNode[] = [];

        if (dcAction.technicalProfiles?.length) {
            for (const tp of dcAction.technicalProfiles) {
                owned.add(tp.technicalProfileId);

                const tpChildren: TreeNode[] = [];
                const inlineCtIds = new Set<string>();

                if (tp.claimsTransformations?.length) {
                    for (const ct of tp.claimsTransformations) {
                        owned.add(ct.id);
                        inlineCtIds.add(ct.id);
                        tpChildren.push({
                            id: `dc-ct-${seq}-${dcAction.displayControlId}-${dcAction.action}-${tp.technicalProfileId}-${ct.id}`,
                            label: ct.id,
                            type: "dcTransformation",
                            stepIndex,
                            metadata: { parentDisplayControlId: dcAction.displayControlId },
                        });
                    }
                }

                for (const ctId of getCtsForTp(tp.technicalProfileId)) {
                    owned.add(ctId);
                    if (!inlineCtIds.has(ctId)) {
                        tpChildren.push({
                            id: `dc-ct-${seq}-${dcAction.displayControlId}-${dcAction.action}-${tp.technicalProfileId}-${ctId}`,
                            label: ctId,
                            type: "dcTransformation",
                            stepIndex,
                            metadata: { parentDisplayControlId: dcAction.displayControlId },
                        });
                    }
                }

                dcChildren.push({
                    id: `dc-tp-${seq}-${dcAction.displayControlId}-${dcAction.action}-${tp.technicalProfileId}`,
                    label: tp.technicalProfileId,
                    type: "dcTechnicalProfile",
                    stepIndex,
                    children: tpChildren.length > 0 ? tpChildren : undefined,
                    metadata: { parentDisplayControlId: dcAction.displayControlId },
                });
            }
        } else if (dcAction.technicalProfileId) {
            owned.add(dcAction.technicalProfileId);

            const legacyCts = getCtsForTp(dcAction.technicalProfileId);
            for (const ctId of legacyCts) {
                owned.add(ctId);
            }

            const legacyCtNodes: TreeNode[] = legacyCts.map((ctId) => ({
                id: `dc-ct-${seq}-${dcAction.displayControlId}-${dcAction.action}-${dcAction.technicalProfileId}-${ctId}`,
                label: ctId,
                type: "dcTransformation" as const,
                stepIndex,
                metadata: { parentDisplayControlId: dcAction.displayControlId },
            }));

            dcChildren.push({
                id: `dc-tp-${seq}-${dcAction.displayControlId}-${dcAction.action}-${dcAction.technicalProfileId}`,
                label: dcAction.technicalProfileId,
                type: "dcTechnicalProfile",
                stepIndex,
                children: legacyCtNodes.length > 0 ? legacyCtNodes : undefined,
                metadata: { parentDisplayControlId: dcAction.displayControlId },
            });
        }

        dcNodes.push({
            id: `dc-${seq}-${dcAction.displayControlId}-${dcAction.action}`,
            label: dcLabel,
            type: "displayControl",
            stepIndex,
            children: dcChildren.length > 0 ? dcChildren : undefined,
            metadata: {
                displayControlId: dcAction.displayControlId,
                action: dcAction.action,
                technicalProfileId: dcAction.technicalProfileId,
                resultCode: dcAction.resultCode,
            },
        });
    }

    return dcNodes;
}

/**
 * Phase 2 ownership pass.
 *
 * Builds Validation Technical Profile nodes and marks both VTP ids and
 * mapped CT ids as owned, ensuring they are not re-attached elsewhere.
 */
function buildValidationTpNodes(params: {
    step: TraceStep;
    seq: number;
    stepIndex: number;
    getCtsForTp: (tpId: string) => string[];
    owned: Set<string>;
}): TreeNode[] {
    const { step, seq, stepIndex, getCtsForTp, owned } = params;
    const vtpNodes: TreeNode[] = [];

    for (const vtpId of step.validationTechnicalProfiles ?? []) {
        owned.add(vtpId);

        const vtpCts = getCtsForTp(vtpId);
        for (const ctId of vtpCts) {
            owned.add(ctId);
        }

        const vtpChildren: TreeNode[] = vtpCts.map((ctId) => ({
            id: `vtp-ct-${seq}-${vtpId}-${ctId}`,
            label: ctId,
            type: "transformation" as const,
            stepIndex,
            metadata: { parentTechnicalProfileId: vtpId },
        }));

        vtpNodes.push({
            id: `vtp-${seq}-${vtpId}`,
            label: vtpId,
            type: "technicalProfile",
            stepIndex,
            children: vtpChildren.length > 0 ? vtpChildren : undefined,
        });
    }

    return vtpNodes;
}

/**
 * Phase 3 candidate selection.
 *
 * Returns technical profiles that are still eligible for direct step-level
 * rendering after ownership has been claimed by DC/VTP phases.
 *
 * In HRD steps, the selected option TP is suppressed to avoid duplicating
 * the decision output as a standard TP node.
 */
function getRemainingTechnicalProfiles(params: {
    step: TraceStep;
    owned: Set<string>;
    isHrdStep: boolean;
}): string[] {
    const { step, owned, isHrdStep } = params;

    return step.technicalProfiles.filter((tp) => {
        if (owned.has(tp)) return false;
        if (isHrdStep && tp === step.selectedOption) return false;
        return true;
    });
}

/**
 * Builds nodes for remaining technical profiles and attaches child content
 * according to nesting rules:
 * - Main SelfAsserted TP absorbs DC and VTP nodes
 * - TP-mapped CTs are attached under each TP
 * - Orphan CTs are absorbed by the single remaining TP when only one exists
 */
function buildRemainingTpNodes(params: {
    seq: number;
    stepIndex: number;
    remainingTps: string[];
    mainSelfAssertedTpId?: string;
    dcNodes: TreeNode[];
    vtpNodes: TreeNode[];
    getCtsForTp: (tpId: string) => string[];
    orphanCts: string[];
    singlePrimaryTpId: string | null;
}): TreeNode[] {
    const {
        seq,
        stepIndex,
        remainingTps,
        mainSelfAssertedTpId,
        dcNodes,
        vtpNodes,
        getCtsForTp,
        orphanCts,
        singlePrimaryTpId,
    } = params;

    const nodes: TreeNode[] = [];

    for (const tp of remainingTps) {
        const isMainSelfAsserted = mainSelfAssertedTpId === tp;
        const tpChildren: TreeNode[] = [];

        if (isMainSelfAsserted) {
            tpChildren.push(...dcNodes);
            tpChildren.push(...vtpNodes);
        }

        for (const ctId of getCtsForTp(tp)) {
            tpChildren.push({
                id: `tp-ct-${seq}-${tp}-${ctId}`,
                label: ctId,
                type: "transformation",
                stepIndex,
                metadata: { parentTechnicalProfileId: tp },
            });
        }

        if (tp === singlePrimaryTpId) {
            for (const ctId of orphanCts) {
                tpChildren.push({
                    id: `tp-ct-${seq}-${tp}-${ctId}`,
                    label: ctId,
                    type: "transformation",
                    stepIndex,
                    metadata: { parentTechnicalProfileId: tp },
                });
            }
        }

        nodes.push({
            id: `tp-${seq}-${tp}`,
            label: tp,
            type: "technicalProfile",
            stepIndex,
            children: tpChildren.length > 0 ? tpChildren : undefined,
        });
    }

    return nodes;
}

/**
 * Builds a tree node for a single step using ownership-chain deduplication.
 *
 * Every component (TP, CT) is assigned exactly one parent via a strict
 * ownership priority:
 *   1. DisplayControl actions own their TPs and those TPs' CTs
 *   2. ValidationTPs own themselves and their CTs
 *   3. Remaining TPs own their unassigned CTs (via technicalProfileDetails)
 *   4. Orphan CTs (no TP context) appear at step level — or under the
 *      single remaining TP when exactly one exists
 *
 * If a main SelfAsserted TP is detected, DC nodes and VTP nodes are nested
 * under it; otherwise they appear at step level.
 */
export function buildStepNode(step: TraceStep, stepIndex: number): TreeNode {
    const children: TreeNode[] = [];
    const seq = step.sequenceNumber;

    const isHrdStep = isHomeRealmDiscoveryStep(step);

    if (isHrdStep) {
        children.push(buildHrdNode(seq, stepIndex, step));
    }

    const tpToCts = createTpToCtsMap(step);
    const getCtsForTp = (tpId: string): string[] => tpToCts.get(tpId) ?? [];

    const mainSelfAssertedTp = step.technicalProfileDetails?.find(
        (tp) => tp.providerType === "SelfAssertedAttributeProvider",
    );

    const owned = new Set<string>();

    const dcNodes = buildDisplayControlNodes({ step, seq, stepIndex, getCtsForTp, owned });
    const vtpNodes = buildValidationTpNodes({ step, seq, stepIndex, getCtsForTp, owned });

    const remainingTps = getRemainingTechnicalProfiles({ step, owned, isHrdStep });

    for (const tp of remainingTps) {
        for (const ctId of getCtsForTp(tp)) {
            owned.add(ctId);
        }
    }

    const orphanCts = step.claimsTransformations.filter((ct) => !owned.has(ct));
    const singlePrimaryTpId = remainingTps.length === 1 ? remainingTps[0] : null;

    const remainingTpNodes = buildRemainingTpNodes({
        seq,
        stepIndex,
        remainingTps,
        mainSelfAssertedTpId: mainSelfAssertedTp?.id,
        dcNodes,
        vtpNodes,
        getCtsForTp,
        orphanCts,
        singlePrimaryTpId,
    });
    children.push(...remainingTpNodes);

    if (!mainSelfAssertedTp) {
        if (dcNodes.length > 0) children.push(...dcNodes);
        children.push(...vtpNodes);
    }

    if (!singlePrimaryTpId) {
        for (const ct of orphanCts) {
            children.push({
                id: `ct-${seq}-${ct}`,
                label: ct,
                type: "transformation",
                stepIndex,
            });
        }
    }

    const primaryTp = step.technicalProfiles[0] || step.actionHandler || "Unknown";

    return {
        id: `step-${seq}`,
        label: `Step ${step.stepOrder} — ${primaryTp}`,
        type: "step",
        step,
        stepIndex,
        metadata: {
            result: step.result,
            isInteractive: step.isInteractiveStep,
            isHrdStep,
            isFinalStep: step.isFinalStep,
            isVerificationStep: step.isVerificationStep,
            duration: step.duration,
            tpCount: step.technicalProfiles.length,
            ctCount: step.claimsTransformations.length,
            selectableOptions: step.selectableOptions,
            selectedOption: step.selectedOption,
        },
        children: children.length > 0 ? children : undefined,
    };
}

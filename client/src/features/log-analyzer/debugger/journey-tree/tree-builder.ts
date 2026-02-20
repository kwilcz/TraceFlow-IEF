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
 * Builds a tree node for a single step.
 *
 * For interactive steps with HRD, shows:
 * 1. HRD selection node (orange, shows available options)
 * 2. Selected option node (the TP that was chosen)
 *
 * For regular steps, shows TPs and CTs as children.
 *
 * For DisplayControl actions, shows nested TPs and CTs under each DC action.
 * If there's a main SelfAsserted TP, DCs are nested under it.
 */
export function buildStepNode(step: TraceStep, stepIndex: number): TreeNode {
    const children: TreeNode[] = [];
    // Only show HRD node for actual HomeRealmDiscovery steps, not self-asserted or other interactive steps
    const isHrdStep =
        step.isInteractiveStep &&
        step.selectableOptions.length > 1 &&
        step.actionHandler?.includes("HomeRealmDiscovery");
    const hasHrdSelection = isHrdStep;

    if (hasHrdSelection) {
        // Add HRD selection node (the interactive choice point)
        // Include selectedOption in metadata so it can be highlighted within the HRD badge
        // (instead of showing as a separate child node)
        children.push({
            id: `hrd-${step.sequenceNumber}`,
            label: "HomeRealmDiscovery",
            type: "hrd",
            stepIndex,
            metadata: {
                isHrdSelection: true,
                selectableOptions: step.selectableOptions,
                selectedOption: step.selectedOption,
                isInteractive: true,
            },
        });
    }

    // Collect TPs that are shown under DisplayControl actions (to avoid duplicating them)
    const displayControlTpIds = new Set<string>();
    const displayControlCtIds = new Set<string>();

    // Find the "main" SelfAsserted TP for this step (if any)
    // This is the TP that contains DisplayControls
    const mainSelfAssertedTp = step.technicalProfileDetails?.find(
        (tp) => tp.providerType === "SelfAssertedAttributeProvider",
    );

    // Build DC nodes
    const dcNodes: TreeNode[] = [];
    for (const dcAction of step.displayControlActions) {
        const dcLabel = dcAction.action
            ? `${dcAction.displayControlId} → ${dcAction.action}`
            : dcAction.displayControlId;

        const dcChildren: TreeNode[] = [];

        // Add nested technical profiles under this DC action
        if (dcAction.technicalProfiles && dcAction.technicalProfiles.length > 0) {
            for (const tp of dcAction.technicalProfiles) {
                displayControlTpIds.add(tp.technicalProfileId);

                const tpChildren: TreeNode[] = [];

                // Add nested claims transformations under this TP
                if (tp.claimsTransformations && tp.claimsTransformations.length > 0) {
                    for (const ct of tp.claimsTransformations) {
                        displayControlCtIds.add(ct.id);
                        tpChildren.push({
                            id: `dc-ct-${step.sequenceNumber}-${dcAction.displayControlId}-${dcAction.action}-${tp.technicalProfileId}-${ct.id}`,
                            label: ct.id,
                            type: "dcTransformation",
                            stepIndex,
                            metadata: {
                                parentDisplayControlId: dcAction.displayControlId,
                            },
                        });
                    }
                }

                dcChildren.push({
                    id: `dc-tp-${step.sequenceNumber}-${dcAction.displayControlId}-${dcAction.action}-${tp.technicalProfileId}`,
                    label: tp.technicalProfileId,
                    type: "dcTechnicalProfile",
                    stepIndex,
                    children: tpChildren.length > 0 ? tpChildren : undefined,
                    metadata: {
                        parentDisplayControlId: dcAction.displayControlId,
                    },
                });
            }
        } else if (dcAction.technicalProfileId) {
            // Fallback to legacy single technicalProfileId
            displayControlTpIds.add(dcAction.technicalProfileId);
            dcChildren.push({
                id: `dc-tp-${step.sequenceNumber}-${dcAction.displayControlId}-${dcAction.action}-${dcAction.technicalProfileId}`,
                label: dcAction.technicalProfileId,
                type: "dcTechnicalProfile",
                stepIndex,
                metadata: {
                    parentDisplayControlId: dcAction.displayControlId,
                },
            });
        }

        dcNodes.push({
            id: `dc-${step.sequenceNumber}-${dcAction.displayControlId}-${dcAction.action}`,
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

    // Build a map of TP -> CTs from technicalProfileDetails
    const tpToCts = new Map<string, string[]>();
    const ctsWithParentTp = new Set<string>();
    if (step.technicalProfileDetails) {
        for (const tpDetail of step.technicalProfileDetails) {
            if (tpDetail.claimsTransformations && tpDetail.claimsTransformations.length > 0) {
                const ctIds = tpDetail.claimsTransformations.map((ct) => ct.id);
                tpToCts.set(tpDetail.id, ctIds);
                for (const ctId of ctIds) {
                    ctsWithParentTp.add(ctId);
                }
            }
        }
    }

    // Collect validation TPs to show them nested under main TP
    const validationTpIds = new Set(step.validationTechnicalProfiles || []);

    // Determine the "primary" TP for this step (for nesting orphan CTs)
    // If there's only one TP (excluding validation TPs), orphan CTs should nest under it
    const visibleTps = step.technicalProfiles.filter(
        (tp) =>
            !(hasHrdSelection && tp === step.selectedOption) &&
            !displayControlTpIds.has(tp) &&
            !validationTpIds.has(tp),
    );
    const hasSinglePrimaryTp = visibleTps.length === 1;
    const singlePrimaryTpId = hasSinglePrimaryTp ? visibleTps[0] : null;

    // Calculate orphan CTs (not under DC or already assigned to a TP)
    const orphanCts = step.claimsTransformations.filter(
        (ct) => !displayControlCtIds.has(ct) && !ctsWithParentTp.has(ct),
    );

    // Add technical profiles as children
    // If there's a main SelfAsserted TP, nest DCs and validation TPs under it
    for (const tp of step.technicalProfiles) {
        // Skip if this TP is already shown as the selected option or under a DisplayControl
        if (hasHrdSelection && tp === step.selectedOption) continue;
        if (displayControlTpIds.has(tp)) continue;

        // Skip validation TPs - they'll be nested under the main TP
        if (validationTpIds.has(tp)) continue;

        // Check if this is the main SelfAsserted TP
        const isMainSelfAsserted = mainSelfAssertedTp && mainSelfAssertedTp.id === tp;

        // Check if this TP has nested CTs
        const nestedCts = tpToCts.get(tp);
        const tpChildren: TreeNode[] = [];

        // If this is the main SelfAsserted TP, nest DCs under it
        if (isMainSelfAsserted && dcNodes.length > 0) {
            tpChildren.push(...dcNodes);
        }

        // If this is the main SelfAsserted TP, nest validation TPs under it
        if (isMainSelfAsserted && step.validationTechnicalProfiles && step.validationTechnicalProfiles.length > 0) {
            for (const vtpId of step.validationTechnicalProfiles) {
                // Get nested CTs for this validation TP
                const vtpNestedCts = tpToCts.get(vtpId);
                const vtpChildren: TreeNode[] = [];

                if (vtpNestedCts && vtpNestedCts.length > 0) {
                    for (const ctId of vtpNestedCts) {
                        vtpChildren.push({
                            id: `vtp-ct-${step.sequenceNumber}-${vtpId}-${ctId}`,
                            label: ctId,
                            type: "transformation",
                            stepIndex,
                            metadata: {
                                parentTechnicalProfileId: vtpId,
                            },
                        });
                    }
                }

                tpChildren.push({
                    id: `vtp-${step.sequenceNumber}-${vtpId}`,
                    label: vtpId,
                    type: "technicalProfile", // Show as regular TP, not special validation node
                    stepIndex,
                    children: vtpChildren.length > 0 ? vtpChildren : undefined,
                });
            }
        }

        // Add nested CTs
        if (nestedCts && nestedCts.length > 0) {
            for (const ctId of nestedCts) {
                tpChildren.push({
                    id: `tp-ct-${step.sequenceNumber}-${tp}-${ctId}`,
                    label: ctId,
                    type: "transformation",
                    stepIndex,
                    metadata: {
                        parentTechnicalProfileId: tp,
                    },
                });
            }
        }

        // If this is the single primary TP, also nest orphan CTs under it
        // This handles OpenIdConnect and similar flows where CTs don't have explicit TP context
        if (tp === singlePrimaryTpId && orphanCts.length > 0) {
            for (const ctId of orphanCts) {
                tpChildren.push({
                    id: `tp-ct-${step.sequenceNumber}-${tp}-${ctId}`,
                    label: ctId,
                    type: "transformation",
                    stepIndex,
                    metadata: {
                        parentTechnicalProfileId: tp,
                    },
                });
            }
        }

        children.push({
            id: `tp-${step.sequenceNumber}-${tp}`,
            label: tp,
            type: "technicalProfile",
            stepIndex,
            children: tpChildren.length > 0 ? tpChildren : undefined,
        });
    }

    // Add DC nodes at step level if there's no main SelfAsserted TP to nest them under
    if (!mainSelfAssertedTp && dcNodes.length > 0) {
        children.push(...dcNodes);
    }

    // Add validation TPs at step level if there's no main SelfAsserted TP
    if (!mainSelfAssertedTp && step.validationTechnicalProfiles && step.validationTechnicalProfiles.length > 0) {
        for (const vtpId of step.validationTechnicalProfiles) {
            // Skip if already shown under DC
            if (displayControlTpIds.has(vtpId)) continue;

            children.push({
                id: `vtp-${step.sequenceNumber}-${vtpId}`,
                label: vtpId,
                type: "technicalProfile",
                stepIndex,
            });
        }
    }

    // Add claims transformations as children (but not if already shown under DisplayControl,
    // under a TP from technicalProfileDetails, or nested under the single primary TP)
    for (const ct of step.claimsTransformations) {
        if (displayControlCtIds.has(ct)) continue;
        if (ctsWithParentTp.has(ct)) continue;
        // Skip if we already nested orphan CTs under the single primary TP
        if (singlePrimaryTpId && orphanCts.includes(ct)) continue;

        children.push({
            id: `ct-${step.sequenceNumber}-${ct}`,
            label: ct,
            type: "transformation",
            stepIndex,
        });
    }

    return {
        id: `step-${step.sequenceNumber}`,
        label: `Step ${step.stepOrder}`,
        type: "step",
        step,
        stepIndex,
        metadata: {
            result: step.result,
            isInteractive: step.isInteractiveStep,
            isHrdStep,
            duration: step.duration,
            tpCount: step.technicalProfiles.length,
            ctCount: step.claimsTransformations.length,
            selectableOptions: step.selectableOptions,
            selectedOption: step.selectedOption,
        },
        children: children.length > 0 ? children : undefined,
    };
}

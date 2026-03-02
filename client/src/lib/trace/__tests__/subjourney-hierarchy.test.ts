/**
 * SubJourney Hierarchy Integration Tests — ChangeSignin_v2 Trace
 *
 * Validates the parser's ability to build correct nested SubJourney trees
 * from a realistic ChangeSignin_v2 flow that exercises both pop detection rules:
 *
 * - Rule 1 ("No ORCH_CS"): OrchManager fires with no ORCH_CS → pop current SubJourney
 * - Rule 2 ("Gap detection"): ORCH_CS jumps by more than 1 → pop levels until the gap
 *   resolves against the parent's lastOrchStep
 *
 * Expected hierarchy:
 *   [root]
 *     └── [subjourney] SubJourney-1
 *           ├── [subjourney] SubJourney-Child1
 *           │     ├── Step 1
 *           │     └── Step 2
 *           ├── [subjourney] SubJourney-Child2
 *           │     └── Step 1
 *           ├── [subjourney] SubJourney-Child3
 *           │     └── Step 1
 *           └── [subjourney] SubJourney-Child4
 *                 └── Step 1
 */

import { describe, it, expect, beforeEach } from "vitest";
import { parseTrace } from "@/lib/trace";
import { getTestSteps } from "./test-step-helpers";
import {
    createTestFixture,
    buildTraceLogInput,
    buildHeadersClip,
    buildOrchestrationManagerAction,
    buildOrchestrationResult,
    buildActionClip,
    buildActionResult,
    buildSubJourneyInvokedRecord,
    type TestFixture,
    pushOrchestrationStep,
} from "./fixtures";
import type { ClipsArray, Statebag } from "@/types/journey-recorder";
import type { TraceLogInput } from "@/types/trace";
import type { FlowNode } from "@/types/flow-node";
import { FlowNodeType } from "@/types/flow-node";

// =============================================================================
// Helpers
// =============================================================================

/** Build ORCH_CS=0 statebag used by EnqueueNewJourneyHandler when pushing a SubJourney. */
function orchResetStatebag(): Partial<Statebag> {
    return {
        ORCH_CS: {
            c: new Date().toISOString(),
            k: "ORCH_CS",
            v: "0",
            p: true,
        },
    };
}

/** Shorthand: EnqueueNewJourneyHandler Action + HandlerResult that pushes a SubJourney. */
function pushSubJourney(subJourneyId: string): ClipsArray {
    return [
        buildActionClip("EnqueueNewJourneyHandler"),
        buildActionResult(
            true,
            buildSubJourneyInvokedRecord(subJourneyId),
            orchResetStatebag() as Statebag,
        ),
    ];
}

/** Shorthand: OrchManager Action + HandlerResult with NO ORCH_CS (Rule 1 pop trigger). */
function orchPopNoOrchCs(): ClipsArray {
    return [
        buildOrchestrationManagerAction(),
        buildActionResult(true), // no statebag → no ORCH_CS → Rule 1 pop
    ];
}

/** Collect all SubJourney-typed children from a FlowNode. */
function subJourneyChildren(node: FlowNode): FlowNode[] {
    return node.children.filter((c) => c.type === FlowNodeType.SubJourney);
}

/** Collect all Step-typed children from a FlowNode. */
function stepChildren(node: FlowNode): FlowNode[] {
    return node.children.filter((c) => c.type === FlowNodeType.Step);
}

/** Find a SubJourney child by journeyId. */
function findSubJourney(parent: FlowNode, journeyId: string): FlowNode | undefined {
    return parent.children.find(
        (c) => c.type === FlowNodeType.SubJourney && c.data.type === FlowNodeType.SubJourney && c.data.journeyId === journeyId,
    );
}

// =============================================================================
// Test Suite
// =============================================================================

describe("ChangeSignin_v2 SubJourney Hierarchy", () => {
    let fixture: TestFixture;

    beforeEach(() => {
        fixture = createTestFixture(42); // fixed seed for determinism
    });

    // -------------------------------------------------------------------------
    // Build the two-log clip sequence that exercises Rules 1 and 2.
    // -------------------------------------------------------------------------

    function buildLogs(): TraceLogInput[] {
        // ----- Log 1 (Event:AUTH) — init through SubJourney-Child2 step 1 -----
        const log1Clips: ClipsArray = [
            // Headers
            buildHeadersClip(fixture, "Event:AUTH"),

            // OrchManager → ORCH_CS=0 (step 0, filtered by parser)
            buildOrchestrationManagerAction(),
            buildOrchestrationResult(0),

            // OrchManager → ORCH_CS=1 (main journey step 1)
            buildOrchestrationManagerAction(),
            buildOrchestrationResult(1),

            // Push SubJourney-1
            ...pushSubJourney("SubJourney-1"),

            // SubJourney-1 step 1 (ORCH_CS=1)
            buildOrchestrationManagerAction(),
            buildOrchestrationResult(1),

            // Push SubJourney-Child1
            ...pushSubJourney("SubJourney-Child1"),

            // SubJourney-Child1 step 1 (ORCH_CS=1)
            ...pushOrchestrationStep(1),

            // SubJourney-Child1 step 2 (ORCH_CS=2)
            buildOrchestrationManagerAction(),
            buildOrchestrationResult(2),

            // *** Rule 1 pop: OrchManager with NO ORCH_CS → pop SubJourney-Child1 ***
            ...orchPopNoOrchCs(),

            // Push SubJourney-Child2 (now back in SubJourney-1, lastOrchStep=2)
            ...pushSubJourney("SubJourney-Child2"),

            // SubJourney-Child2 step 1 (ORCH_CS=1)
            buildOrchestrationManagerAction(),
            buildOrchestrationResult(1),
        ];

        // ----- Log 2 (Event:API) — pops RouteLocal, ReadUser, then MFA -----
        const log2Clips: ClipsArray = [
            // Headers
            buildHeadersClip(fixture, "Event:API"),

            // *** Rule 2 pop: ORCH_CS jumps to 3 ***
            // In SubJourney-Child2(step=1), parent ALO(lastStep=2). 3 - 2 = 1 → pop 1 level.
            // Creates step 3 in SubJourney-1.
            buildOrchestrationManagerAction(),
            buildOrchestrationResult(3),

            // Push SubJourney-Child3
            ...pushSubJourney("SubJourney-Child3"),

            // SubJourney-Child3 step 1 (ORCH_CS=1)
            buildOrchestrationManagerAction(),
            buildOrchestrationResult(1),

            // *** Rule 2 pop: ORCH_CS jumps to 4 ***
            // In SubJourney-Child3(step=1), parent ALO(lastStep=3). 4 - 3 = 1 → pop 1 level.
            // Creates step 4 in SubJourney-1.
            buildOrchestrationManagerAction(),
            buildOrchestrationResult(4),

            // Push SubJourney-Child4
            ...pushSubJourney("SubJourney-Child4"),

            // SubJourney-Child4 step 1 (ORCH_CS=1)
            buildOrchestrationManagerAction(),
            buildOrchestrationResult(1),
        ];

        return [
            buildTraceLogInput(fixture, log1Clips, 0),
            buildTraceLogInput(fixture, log2Clips, 5000),
        ];
    }

    // =========================================================================
    // Test 1 — Root structure
    // =========================================================================

    it("should produce correct flowTree root structure", () => {
        const result = parseTrace(buildLogs());
        const tree = result.flowTree;

        expect(tree.type).toBe("root");
        expect(tree.data.type).toBe("root");

        // Root must have exactly 1 child: SubJourney-1
        // (invocation step has subJourneyId so it's excluded from FlowTree)
        expect(tree.children.length).toBe(1);

        // Exactly one SubJourney at root level: SubJourney-1
        const rootSubJourneys = subJourneyChildren(tree);
        expect(rootSubJourneys, "Root must have exactly one SubJourney").toHaveLength(1);
        expect(rootSubJourneys[0].data.type).toBe("subjourney");
        if (rootSubJourneys[0].data.type === "subjourney") {
            expect(rootSubJourneys[0].data.journeyId).toBe("SubJourney-1");
        }
    });

    // =========================================================================
    // Test 2 — SubJourney-1 contains right SubJourneys
    // =========================================================================

    it("should correctly nest subjourneys", () => {
        const result = parseTrace(buildLogs());
        const tree = result.flowTree;

        const alo = findSubJourney(tree, "SubJourney-1");
        expect(alo).toBeDefined();

        const aloSubJourneys = subJourneyChildren(alo!);
        expect(aloSubJourneys).toHaveLength(4);

        const sjIds = aloSubJourneys.map((sj) => {
            if (sj.data.type === "subjourney") return sj.data.journeyId;
            return "";
        });

        expect(sjIds).toContain("SubJourney-Child1");
        expect(sjIds).toContain("SubJourney-Child2");
        expect(sjIds).toContain("SubJourney-Child3");
        expect(sjIds).toContain("SubJourney-Child4");
    });

    // =========================================================================
    // Test 3 — SubJourney-Child1 has steps 1 and 2
    // =========================================================================

    it("should have steps 1 and 2 inside SubJourney-Child1", () => {
        const result = parseTrace(buildLogs());
        const tree = result.flowTree;

        const alo = findSubJourney(tree, "SubJourney-1")!;
        const ais = findSubJourney(alo, "SubJourney-Child1")!;
        expect(ais).toBeDefined();

        const aisSteps = stepChildren(ais);
        expect(aisSteps, "SubJourney-Child1 should include only steps 1 and 2").toHaveLength(2);

        const stepOrders = aisSteps.map((s) => {
            if (s.data.type === "step") return s.data.stepOrder;
            return -1;
        });
        expect(stepOrders).toContain(1);
        expect(stepOrders).toContain(2);
    });

    // =========================================================================
    // Test 4 — Rule 1 pop: SubJourney-Child1 exits via no ORCH_CS
    // =========================================================================

    it("should pop SubJourney-Child1 via Rule 1 (no ORCH_CS)", () => {
        const result = parseTrace(buildLogs());
        const tree = result.flowTree;

        const alo = findSubJourney(tree, "SubJourney-1")!;
        expect(alo).toBeDefined();

        // SubJourney-Child1 must be a child of ALO, NOT a child of itself
        const ais = findSubJourney(alo, "SubJourney-Child1")!;
        expect(ais).toBeDefined();

        // SubJourney-Child1 should have exactly 2 step children (no nested SJs)
        expect(subJourneyChildren(ais)).toHaveLength(0);
        expect(stepChildren(ais), "SubJourney-Child1 should include only steps 1 and 2").toHaveLength(2);

        // SubJourney-Child2 is a SIBLING of SubJourney-Child1 (both under ALO)
        const arl = findSubJourney(alo, "SubJourney-Child2");
        expect(arl).toBeDefined();

        // SubJourney-Child2 must NOT be nested inside SubJourney-Child1
        expect(findSubJourney(ais, "SubJourney-Child2")).toBeUndefined();
    });

    // =========================================================================
    // Test 5 — Rule 2 pop: SubJourney-Child2 exits via gap detection (1→3)
    // =========================================================================

    it("should pop SubJourney-Child2 via Rule 2 (gap detection, ORCH_CS 1→3)", () => {
        const result = parseTrace(buildLogs());
        const tree = result.flowTree;

        const alo = findSubJourney(tree, "SubJourney-1")!;
        expect(alo).toBeDefined();

        // SubJourney-Child2 has exactly 1 step
        const arl = findSubJourney(alo, "SubJourney-Child2")!;
        expect(arl).toBeDefined();
        expect(stepChildren(arl), "SubJourney-Child2 should include only step 1").toHaveLength(1);

        // Step 3 is a SubJourney invocation step (pushes SubJourney-Child3),
        // so it does not appear as a Step node in the FlowTree.
        const aloSteps = stepChildren(alo);
        const step3 = aloSteps.find(
            (s) => s.data.type === "step" && s.data.stepOrder === 3,
        );
        expect(step3).toBeUndefined();
    });

    // =========================================================================
    // Test 6 — Rule 2 pop: SubJourney-Child3 exits via gap detection (1→4)
    // =========================================================================

    it("should pop SubJourney-Child3 via Rule 2 (gap detection, ORCH_CS 1→4)", () => {
        const result = parseTrace(buildLogs());
        const tree = result.flowTree;

        const alo = findSubJourney(tree, "SubJourney-1")!;

        // SubJourney-Child3 has exactly 1 step
        const aru = findSubJourney(alo, "SubJourney-Child3")!;
        expect(aru).toBeDefined();
        expect(stepChildren(aru), "SubJourney-Child3 should include only step 1").toHaveLength(1);

        // Step 4 is a SubJourney invocation step (pushes SubJourney-Child4),
        // so it does not appear as a Step node in the FlowTree.
        const aloSteps = stepChildren(alo);
        const step4 = aloSteps.find(
            (s) => s.data.type === "step" && s.data.stepOrder === 4,
        );
        expect(step4).toBeUndefined();
    });

    // =========================================================================
    // Test 7 — Complete hierarchy shape
    // =========================================================================

    it("should produce the complete expected SubJourney hierarchy", () => {
        const result = parseTrace(buildLogs());
        const tree = result.flowTree;

        // Root → SubJourney-1
        const alo = findSubJourney(tree, "SubJourney-1")!;
        expect(alo).toBeDefined();

        // SubJourney-1 SubJourney children in correct order
        const aloSJs = subJourneyChildren(alo);
        expect(aloSJs).toHaveLength(4);

        const orderedIds = aloSJs.map((sj) =>
            sj.data.type === "subjourney" ? sj.data.journeyId : "",
        );
        expect(orderedIds).toEqual([
            "SubJourney-Child1",
            "SubJourney-Child2",
            "SubJourney-Child3",
            "SubJourney-Child4",
        ]);

        // SubJourney-Child1 → 2 steps, 0 SubJourneys
        const ais = findSubJourney(alo, "SubJourney-Child1")!;
        expect(stepChildren(ais)).toHaveLength(2);
        expect(subJourneyChildren(ais)).toHaveLength(0);

        // SubJourney-Child2 → 1 step, 0 SubJourneys
        const arl = findSubJourney(alo, "SubJourney-Child2")!;
        expect(stepChildren(arl)).toHaveLength(1);
        expect(subJourneyChildren(arl)).toHaveLength(0);

        // SubJourney-Child3 → 1 step, 0 SubJourneys
        const aru = findSubJourney(alo, "SubJourney-Child3")!;
        expect(stepChildren(aru)).toHaveLength(1);
        expect(subJourneyChildren(aru)).toHaveLength(0);

        // SubJourney-Child4 → 1 step, 0 SubJourneys
        const amfa = findSubJourney(alo, "SubJourney-Child4")!;
        expect(stepChildren(amfa)).toHaveLength(1);
        expect(subJourneyChildren(amfa)).toHaveLength(0);
    });

    // =========================================================================
    // Test 8 — Flat traceSteps have correct journeyContextId
    // =========================================================================

    it("should assign correct journeyContextId to steps in SubJourneys", () => {
        const result = parseTrace(buildLogs());
        const steps = getTestSteps(result);

        // Steps inside SubJourney-Child1 should reference it as their journey context
        const aisSteps = steps.filter((s) => s.journeyName.includes("SubJourney-Child1"));
        expect(aisSteps.length).toBeGreaterThanOrEqual(2);
        aisSteps.forEach((s) => {
            expect(s.journeyName).toBe("SubJourney-Child1");
        });

        // Steps inside SubJourney-Child2
        const arlSteps = steps.filter((s) => s.journeyName.includes("SubJourney-Child2"));
        expect(arlSteps.length).toBeGreaterThanOrEqual(1);

        // Steps inside SubJourney-Child3
        const aruSteps = steps.filter((s) => s.journeyName.includes("SubJourney-Child3"));
        expect(aruSteps.length).toBeGreaterThanOrEqual(1);

        // Steps inside SubJourney-Child4
        const amfaSteps = steps.filter((s) => s.journeyName.includes("SubJourney-Child4"));
        expect(amfaSteps.length).toBeGreaterThanOrEqual(1);
    });

    // =========================================================================
    // Test 9 — traceSteps have correct ORCH_CS-derived stepOrders
    // =========================================================================

    it("should have correct stepOrder values derived from ORCH_CS", () => {
        const result = parseTrace(buildLogs());
        const steps = getTestSteps(result);

        // Collect all step orders grouped by journey
        const stepsByJourney = new Map<string, number[]>();
        for (const step of steps) {
            const key = step.journeyName;
            if (!stepsByJourney.has(key)) stepsByJourney.set(key, []);
            stepsByJourney.get(key)!.push(step.orchestrationStep);
        }

        // SubJourney-Child1 should have steps 1, 2
        const aisOrders = stepsByJourney.get("SubJourney-Child1") ?? [];
        expect(aisOrders).toContain(1);
        expect(aisOrders).toContain(2);

        // SubJourney-Child2 should have step 1
        const arlOrders = stepsByJourney.get("SubJourney-Child2") ?? [];
        expect(arlOrders).toContain(1);

        // SubJourney-Child3 should have step 1
        const aruOrders = stepsByJourney.get("SubJourney-Child3") ?? [];
        expect(aruOrders).toContain(1);

        // SubJourney-Child4 should have step 1
        const amfaOrders = stepsByJourney.get("SubJourney-Child4") ?? [];
        expect(amfaOrders).toContain(1);
    });

    // =========================================================================
    // Test 10 — Parsing succeeds without errors
    // =========================================================================

    it("should parse without errors", () => {
        const result = parseTrace(buildLogs());

        expect(result.success).toBe(true);
        expect(result.errors).toHaveLength(0);
    });
});

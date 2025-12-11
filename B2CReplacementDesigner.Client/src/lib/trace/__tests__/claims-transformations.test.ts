/**
 * Claims Transformation Tests
 *
 * Tests the parser's ability to extract and track claims
 * transformation execution details.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { parseTrace } from "@/lib/trace";
import {
    createTestFixture,
    buildTraceLogInput,
    buildHeadersClip,
    buildOrchestrationManagerAction,
    buildOrchestrationResult,
    buildActionClip,
    buildActionResult,
    buildClaimsTransformationRecord,
    type TestFixture,
} from "./fixtures";

describe("Claims Transformations", () => {
    let fixture: TestFixture;

    beforeEach(() => {
        fixture = createTestFixture();
    });

    describe("Transformation Extraction", () => {
        it("should extract claims transformation ID", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(6),
                        buildActionClip("OutputClaimsTransformationHandler"),
                        buildActionResult(
                            true,
                            buildClaimsTransformationRecord(
                                fixture.claimsTransformations.getDateTime,
                                [],
                                [{ type: "currentTime", value: "2024-01-15T10:00:00Z" }]
                            )
                        ),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].claimsTransformationDetails).toHaveLength(1);
            expect(result.traceSteps[0].claimsTransformationDetails[0].id).toBe(fixture.claimsTransformations.getDateTime);
        });

        it("should extract input claims from transformation", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(7),
                        buildActionClip("OutputClaimsTransformationHandler"),
                        buildActionResult(
                            true,
                            buildClaimsTransformationRecord(
                                fixture.claimsTransformations.createDisplayName,
                                [
                                    { type: "givenName", value: "Test" },
                                    { type: "surname", value: "User" },
                                ],
                                [{ type: "displayName", value: "Test User" }]
                            )
                        ),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            const ct = result.traceSteps[0].claimsTransformationDetails[0];
            expect(ct.inputClaims).toHaveLength(2);
            expect(ct.inputClaims).toContainEqual({ claimType: "givenName", value: "Test" });
            expect(ct.inputClaims).toContainEqual({ claimType: "surname", value: "User" });
        });

        it("should extract output claims from transformation", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(7),
                        buildActionClip("OutputClaimsTransformationHandler"),
                        buildActionResult(
                            true,
                            buildClaimsTransformationRecord(
                                fixture.claimsTransformations.createDisplayName,
                                [
                                    { type: "givenName", value: "Test" },
                                    { type: "surname", value: "User" },
                                ],
                                [{ type: "displayName", value: "Test User" }]
                            )
                        ),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            const ct = result.traceSteps[0].claimsTransformationDetails[0];
            expect(ct.outputClaims).toHaveLength(1);
            expect(ct.outputClaims[0]).toEqual({ claimType: "displayName", value: "Test User" });
        });
    });

    describe("Multiple Transformations", () => {
        it("should handle multiple transformations in single step", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(5),
                        buildActionClip("OutputClaimsTransformationHandler"),
                        buildActionResult(true, {
                            Values: [
                                {
                                    Key: "OutputClaimsTransformation",
                                    Value: {
                                        Values: [
                                            {
                                                Key: "ClaimsTransformation",
                                                Value: { Values: [{ Key: "Id", Value: "Transform1" }] },
                                            },
                                            {
                                                Key: "ClaimsTransformation",
                                                Value: { Values: [{ Key: "Id", Value: "Transform2" }] },
                                            },
                                            {
                                                Key: "ClaimsTransformation",
                                                Value: { Values: [{ Key: "Id", Value: "Transform3" }] },
                                            },
                                        ],
                                    },
                                },
                            ],
                        }),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].claimsTransformationDetails).toHaveLength(3);
            expect(result.traceSteps[0].claimsTransformationDetails.map((ct) => ct.id)).toEqual([
                "Transform1",
                "Transform2",
                "Transform3",
            ]);
        });

        it("should track transformation IDs in simple array", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(5),
                        buildActionClip("OutputClaimsTransformationHandler"),
                        buildActionResult(true, {
                            Values: [
                                {
                                    Key: "OutputClaimsTransformation",
                                    Value: {
                                        Values: [
                                            { Key: "ClaimsTransformation", Value: { Values: [{ Key: "Id", Value: "TransformA" }] } },
                                            { Key: "ClaimsTransformation", Value: { Values: [{ Key: "Id", Value: "TransformB" }] } },
                                        ],
                                    },
                                },
                            ],
                        }),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].claimsTransformations).toContain("TransformA");
            expect(result.traceSteps[0].claimsTransformations).toContain("TransformB");
        });
    });

    describe("Edge Cases", () => {
        it("should handle transformation with no input claims", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(6),
                        buildActionClip("OutputClaimsTransformationHandler"),
                        buildActionResult(
                            true,
                            buildClaimsTransformationRecord(
                                fixture.claimsTransformations.getDateTime,
                                [],
                                [{ type: "timestamp", value: "2024-01-15T10:00:00Z" }]
                            )
                        ),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].claimsTransformationDetails[0].inputClaims).toEqual([]);
        });

        it("should handle empty transformations gracefully", () => {
            const logs = [
                buildTraceLogInput(
                    fixture,
                    [
                        buildHeadersClip(fixture, "Event:API"),
                        buildOrchestrationManagerAction(),
                        buildOrchestrationResult(6),
                    ],
                    0
                ),
            ];

            const result = parseTrace(logs);

            expect(result.traceSteps[0].claimsTransformationDetails).toEqual([]);
        });
    });
});

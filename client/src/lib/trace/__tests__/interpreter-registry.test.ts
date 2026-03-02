/**
 * Interpreter Registry Tests
 *
 * Tests for the interpreter registry pattern.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
    InterpreterRegistry,
    OrchestrationInterpreter,
    ClaimsExchangeInterpreter,
    ClaimsTransformationInterpreter,
    HomeRealmDiscoveryInterpreter,
    SubJourneyInterpreter,
    SelfAssertedValidationInterpreter,
    getInterpreterRegistry,
} from "../interpreters";
import { ORCHESTRATION_MANAGER, CLAIMS_EXCHANGE_ACTION, HRD_HANDLERS, SUBJOURNEY_HANDLERS } from "../constants/handlers";

describe("InterpreterRegistry", () => {
    beforeEach(() => {
        InterpreterRegistry.resetInstance();
    });

    afterEach(() => {
        InterpreterRegistry.resetInstance();
    });

    it("should be a singleton", () => {
        const registry1 = InterpreterRegistry.getInstance();
        const registry2 = InterpreterRegistry.getInstance();

        expect(registry1).toBe(registry2);
    });

    it("should register and retrieve interpreters", () => {
        const registry = InterpreterRegistry.getInstance();
        const interpreter = new OrchestrationInterpreter();

        registry.register(interpreter);

        const retrieved = registry.getInterpreter(ORCHESTRATION_MANAGER);
        expect(retrieved).toBe(interpreter);
    });

    it("should return default interpreter for unknown handlers when fallback enabled", () => {
        const registry = InterpreterRegistry.getInstance({ useDefaultFallback: true });

        const interpreter = registry.getInterpreter("Unknown.Handler");
        expect(interpreter).not.toBeNull();
        expect(interpreter?.canHandle("anything")).toBe(false);
    });

    it("should return null for unknown handlers when fallback disabled", () => {
        InterpreterRegistry.resetInstance();
        const registry = InterpreterRegistry.getInstance({ useDefaultFallback: false });

        const interpreter = registry.getInterpreter("Unknown.Handler");
        expect(interpreter).toBeNull();
    });

    it("should register all interpreters via getInterpreterRegistry", () => {
        const registry = getInterpreterRegistry();

        expect(registry.getAll().length).toBeGreaterThan(0);
        expect(registry.getInterpreter(ORCHESTRATION_MANAGER)).toBeInstanceOf(OrchestrationInterpreter);
    });

    it("should track registered interpreters in stats", () => {
        const registry = InterpreterRegistry.getInstance();

        registry.register(new SelfAssertedValidationInterpreter());
        registry.register(new OrchestrationInterpreter());
        registry.register(new ClaimsTransformationInterpreter());

        const stats = registry.getStats();
        expect(stats.interpreterCount).toBe(3);
        expect(stats.interpreterDetails.length).toBe(3);
        expect(stats.interpreterDetails.some((d) => d.name === "OrchestrationInterpreter")).toBe(true);
    });

    it("should unregister interpreters", () => {
        const registry = InterpreterRegistry.getInstance();
        registry.register(new OrchestrationInterpreter());

        expect(registry.hasInterpreter(ORCHESTRATION_MANAGER)).toBe(true);

        registry.unregister(ORCHESTRATION_MANAGER);

        expect(registry.hasInterpreter(ORCHESTRATION_MANAGER)).toBe(false);
    });

    it("should clear all interpreters", () => {
        const registry = getInterpreterRegistry();

        expect(registry.getAll().length).toBeGreaterThan(0);

        registry.clear();

        expect(registry.getAll().length).toBe(0);
    });
});

describe("Interpreter implementations", () => {
    describe("OrchestrationInterpreter", () => {
        it("should handle OrchestrationManager", () => {
            const interpreter = new OrchestrationInterpreter();

            expect(interpreter.canHandle(ORCHESTRATION_MANAGER)).toBe(true);
            expect(interpreter.canHandle("Unknown")).toBe(false);
        });

        it("should have correct handler names", () => {
            const interpreter = new OrchestrationInterpreter();

            expect(interpreter.handlerNames).toContain(ORCHESTRATION_MANAGER);
        });
    });

    describe("ClaimsExchangeInterpreter", () => {
        it("should handle claims exchange handlers", () => {
            const interpreter = new ClaimsExchangeInterpreter();

            expect(interpreter.canHandle(CLAIMS_EXCHANGE_ACTION)).toBe(true);
        });

        it("should have correct handler names", () => {
            const interpreter = new ClaimsExchangeInterpreter();

            expect(interpreter.handlerNames).toContain(CLAIMS_EXCHANGE_ACTION);
        });
    });

    describe("HomeRealmDiscoveryInterpreter", () => {
        it("should handle HRD handlers", () => {
            const interpreter = new HomeRealmDiscoveryInterpreter();

            expect(interpreter.handlerNames.length).toBeGreaterThan(0);
            for (const handler of HRD_HANDLERS) {
                expect(interpreter.canHandle(handler)).toBe(true);
            }
        });
    });

    describe("SubJourneyInterpreter", () => {
        it("should handle SubJourney handlers", () => {
            const interpreter = new SubJourneyInterpreter();

            expect(interpreter.handlerNames.length).toBeGreaterThan(0);
            for (const handler of SUBJOURNEY_HANDLERS) {
                expect(interpreter.canHandle(handler)).toBe(true);
            }
        });
    });
});

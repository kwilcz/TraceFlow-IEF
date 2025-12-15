/**
 * Journey Stack Tests
 *
 * Tests for the JourneyStack domain object.
 */

import { describe, it, expect } from "vitest";
import { JourneyStack, JourneyStackFactory } from "../domain/journey-stack";

describe("JourneyStack", () => {
    describe("construction", () => {
        it("should initialize with root journey", () => {
            const stack = new JourneyStack("SignUpOrSignIn", "Sign Up Or Sign In");

            expect(stack.current().journeyId).toBe("SignUpOrSignIn");
            expect(stack.current().journeyName).toBe("Sign Up Or Sign In");
            expect(stack.depth()).toBe(0);
            expect(stack.isInSubJourney()).toBe(false);
        });
    });

    describe("push/pop operations", () => {
        it("should push SubJourney onto stack", () => {
            const stack = new JourneyStack("Main", "Main Journey");

            stack.push({ journeyId: "Sub1", journeyName: "SubJourney 1" });

            expect(stack.depth()).toBe(1);
            expect(stack.current().journeyId).toBe("Sub1");
            expect(stack.isInSubJourney()).toBe(true);
        });

        it("should pop SubJourney from stack", () => {
            const stack = new JourneyStack("Main", "Main Journey");
            stack.push({ journeyId: "Sub1", journeyName: "SubJourney 1" });

            const popped = stack.pop();

            expect(popped?.journeyId).toBe("Sub1");
            expect(stack.depth()).toBe(0);
            expect(stack.current().journeyId).toBe("Main");
        });

        it("should not pop root journey", () => {
            const stack = new JourneyStack("Main", "Main Journey");

            const popped = stack.pop();

            expect(popped).toBeUndefined();
            expect(stack.depth()).toBe(0);
        });

        it("should support nested SubJourneys", () => {
            const stack = new JourneyStack("Main", "Main Journey");

            stack.push({ journeyId: "Sub1", journeyName: "SubJourney 1" });
            stack.push({ journeyId: "Sub2", journeyName: "SubJourney 2" });

            expect(stack.depth()).toBe(2);
            expect(stack.current().journeyId).toBe("Sub2");

            stack.pop();
            expect(stack.current().journeyId).toBe("Sub1");

            stack.pop();
            expect(stack.current().journeyId).toBe("Main");
        });
    });

    describe("navigation helpers", () => {
        it("should return root journey", () => {
            const stack = new JourneyStack("Main", "Main Journey");
            stack.push({ journeyId: "Sub1", journeyName: "SubJourney 1" });

            expect(stack.root().journeyId).toBe("Main");
        });

        it("should return parent journey", () => {
            const stack = new JourneyStack("Main", "Main Journey");
            stack.push({ journeyId: "Sub1", journeyName: "SubJourney 1" });
            stack.push({ journeyId: "Sub2", journeyName: "SubJourney 2" });

            expect(stack.parent()?.journeyId).toBe("Sub1");
        });

        it("should return undefined for parent at root", () => {
            const stack = new JourneyStack("Main", "Main Journey");

            expect(stack.parent()).toBeUndefined();
        });
    });

    describe("journey path", () => {
        it("should build journey path", () => {
            const stack = new JourneyStack("Main", "Main Journey");
            stack.push({ journeyId: "Sub1", journeyName: "SubJourney 1" });
            stack.push({ journeyId: "Sub2", journeyName: "SubJourney 2" });

            expect(stack.getJourneyPath()).toEqual(["Main", "Sub1", "Sub2"]);
        });

        it("should build display path", () => {
            const stack = new JourneyStack("Main", "Main Journey");
            stack.push({ journeyId: "Sub1", journeyName: "SubJourney 1" });

            expect(stack.getDisplayPath()).toBe("Main Journey > SubJourney 1");
        });
    });

    describe("orchestration step tracking", () => {
        it("should update orchestration step", () => {
            const stack = new JourneyStack("Main", "Main Journey");

            stack.updateOrchStep(5);

            expect(stack.current().lastOrchStep).toBe(5);
        });
    });

    describe("snapshot and restore", () => {
        it("should create and restore snapshot", () => {
            const stack = new JourneyStack("Main", "Main Journey");
            stack.push({ journeyId: "Sub1", journeyName: "SubJourney 1" });
            stack.updateOrchStep(3);

            const snapshot = stack.snapshot();

            stack.push({ journeyId: "Sub2", journeyName: "SubJourney 2" });
            expect(stack.depth()).toBe(2);

            stack.restore(snapshot);

            expect(stack.depth()).toBe(1);
            expect(stack.current().journeyId).toBe("Sub1");
            expect(stack.current().lastOrchStep).toBe(3);
        });
    });

    describe("popUntil", () => {
        it("should pop until reaching target journey", () => {
            const stack = new JourneyStack("Main", "Main Journey");
            stack.push({ journeyId: "Sub1", journeyName: "SubJourney 1" });
            stack.push({ journeyId: "Sub2", journeyName: "SubJourney 2" });
            stack.push({ journeyId: "Sub3", journeyName: "SubJourney 3" });

            const popped = stack.popUntil("Sub1");

            expect(popped.length).toBe(2);
            expect(stack.current().journeyId).toBe("Sub1");
        });
    });
});

describe("JourneyStackFactory", () => {
    it("should create stack with root journey", () => {
        const stack = JourneyStackFactory.withRoot("Main", "Main Journey");

        expect(stack.current().journeyId).toBe("Main");
        expect(stack.depth()).toBe(0);
    });

    it("should create stack from hierarchy", () => {
        const stack = JourneyStackFactory.fromHierarchy([
            { id: "Main", name: "Main Journey" },
            { id: "Sub1", name: "SubJourney 1" },
            { id: "Sub2", name: "SubJourney 2" },
        ]);

        expect(stack.depth()).toBe(2);
        expect(stack.current().journeyId).toBe("Sub2");
        expect(stack.root().journeyId).toBe("Main");
    });

    it("should throw for empty hierarchy", () => {
        expect(() => JourneyStackFactory.fromHierarchy([])).toThrow(
            "Journey hierarchy cannot be empty"
        );
    });
});

/**
 * TraceStep Builder
 *
 * Domain object for constructing TraceStep instances using the Builder pattern.
 * Provides a fluent API for creating trace steps with validation.
 *
 * @example
 * ```ts
 * const step = TraceStepBuilder.create()
 *   .withSequence(0)
 *   .withTimestamp(new Date())
 *   .withJourneyContext("SignUpOrSignIn", "Sign Up Or Sign In Journey")
 *   .withOrchStep(1)
 *   .addTechnicalProfile("SelfAsserted-LocalAccountSignin-Email")
 *   .build();
 * ```
 */

import type {
    TraceStep,
    StepResult,
    ClaimsTransformationDetail,
    TechnicalProfileDetail,
    ClaimMapping,
    BackendApiCall,
    UiSettings,
    DisplayControlAction,
} from "@/types/trace";

/**
 * Builder for creating TraceStep instances with a fluent API.
 */
export class TraceStepBuilder {
    private readonly step: TraceStep;

    private constructor() {
        this.step = {
            sequenceNumber: 0,
            timestamp: new Date(),
            logId: "",
            eventType: "AUTH",
            graphNodeId: "",
            journeyContextId: "",
            currentJourneyName: "",
            stepOrder: 0,
            result: "Success",
            statebagSnapshot: {},
            claimsSnapshot: {},
            technicalProfiles: [],
            selectableOptions: [],
            isInteractiveStep: false,
            claimsTransformations: [],
            claimsTransformationDetails: [],
            displayControls: [],
            displayControlActions: [],
        };
    }

    /**
     * Creates a new TraceStepBuilder instance.
     */
    static create(): TraceStepBuilder {
        return new TraceStepBuilder();
    }

    /**
     * Creates a builder pre-populated from an existing step.
     */
    static from(existing: TraceStep): TraceStepBuilder {
        const builder = new TraceStepBuilder();
        Object.assign(builder.step, structuredClone(existing));
        return builder;
    }

    /**
     * Sets the sequence number for global ordering.
     */
    withSequence(sequenceNumber: number): this {
        this.step.sequenceNumber = sequenceNumber;
        return this;
    }

    /**
     * Sets the timestamp of execution.
     */
    withTimestamp(timestamp: Date): this {
        this.step.timestamp = timestamp;
        return this;
    }

    /**
     * Sets the log ID for syncing with log viewer.
     */
    withLogId(logId: string): this {
        this.step.logId = logId;
        return this;
    }

    /**
     * Sets the event type.
     */
    withEventType(eventType: TraceStep["eventType"]): this {
        this.step.eventType = eventType;
        return this;
    }

    /**
     * Sets the graph node ID for ReactFlow correlation.
     */
    withGraphNodeId(nodeId: string): this {
        this.step.graphNodeId = nodeId;
        return this;
    }

    /**
     * Sets the journey context (ID and display name).
     */
    withJourneyContext(journeyId: string, journeyName: string): this {
        this.step.journeyContextId = journeyId;
        this.step.currentJourneyName = journeyName;
        return this;
    }

    /**
     * Sets the orchestration step order.
     */
    withOrchStep(stepOrder: number): this {
        this.step.stepOrder = stepOrder;
        return this;
    }

    /**
     * Sets the step result.
     */
    withResult(result: StepResult): this {
        this.step.result = result;
        return this;
    }

    /**
     * Sets the statebag snapshot.
     */
    withStatebag(statebag: Record<string, string>): this {
        this.step.statebagSnapshot = { ...statebag };
        return this;
    }

    /**
     * Sets the claims snapshot.
     */
    withClaims(claims: Record<string, string>): this {
        this.step.claimsSnapshot = { ...claims };
        return this;
    }

    /**
     * Sets an error message and result to Error.
     */
    withError(errorMessage: string, errorHResult?: string): this {
        this.step.errorMessage = errorMessage;
        if (errorHResult) {
            this.step.errorHResult = errorHResult;
        }
        this.step.result = "Error";
        return this;
    }

    /**
     * Sets the action handler.
     */
    withActionHandler(handler: string): this {
        this.step.actionHandler = handler;
        return this;
    }

    /**
     * Sets predicate evaluation result.
     */
    withPredicateResult(result: string): this {
        this.step.predicateResult = result;
        return this;
    }

    /**
     * Sets the SubJourney ID when this step invokes a SubJourney.
     */
    withSubJourneyId(subJourneyId: string): this {
        this.step.subJourneyId = subJourneyId;
        return this;
    }

    /**
     * Sets the selected option (e.g., ClaimsExchange ID selected in HRD flow).
     */
    withSelectedOption(option: string): this {
        this.step.selectedOption = option;
        return this;
    }

    /**
     * Marks this step as interactive (requiring user input).
     */
    asInteractiveStep(): this {
        this.step.isInteractiveStep = true;
        return this;
    }

    /**
     * Marks this step as the final step (journey completion with token issuance).
     */
    asFinalStep(): this {
        this.step.isFinalStep = true;
        return this;
    }

    /**
     * Sets the transition event name.
     */
    withTransitionEvent(eventName: string): this {
        this.step.transitionEvent = eventName;
        return this;
    }

    /**
     * Adds a technical profile to the step.
     */
    addTechnicalProfile(profileId: string): this {
        if (!this.step.technicalProfiles.includes(profileId)) {
            this.step.technicalProfiles.push(profileId);
        }
        return this;
    }

    /**
     * Adds multiple technical profiles.
     */
    addTechnicalProfiles(profileIds: string[]): this {
        for (const id of profileIds) {
            this.addTechnicalProfile(id);
        }
        return this;
    }

    /**
     * Adds detailed technical profile information (including provider type).
     * If the TP already exists, merges claimsTransformations into it.
     */
    addTechnicalProfileDetail(detail: TechnicalProfileDetail): this {
        if (!this.step.technicalProfileDetails) {
            this.step.technicalProfileDetails = [];
        }
        
        // Check if TP already exists
        const existingIndex = this.step.technicalProfileDetails.findIndex((d) => d.id === detail.id);
        
        if (existingIndex >= 0) {
            // Merge: add any new claimsTransformations
            const existing = this.step.technicalProfileDetails[existingIndex];
            if (detail.claimsTransformations && detail.claimsTransformations.length > 0) {
                if (!existing.claimsTransformations) {
                    existing.claimsTransformations = [];
                }
                // Add CTs that don't already exist (by id)
                for (const ct of detail.claimsTransformations) {
                    if (!existing.claimsTransformations.some((existingCt) => existingCt.id === ct.id)) {
                        existing.claimsTransformations.push(ct);
                    }
                }
            }
            // Update providerType/protocolType if not set
            if (!existing.providerType && detail.providerType) {
                existing.providerType = detail.providerType;
            }
            if (!existing.protocolType && detail.protocolType) {
                existing.protocolType = detail.protocolType;
            }
            // Always update claimsSnapshot to the latest value —
            // later interpreters have more accurate state since claims
            // were applied between interpreter invocations.
            if (detail.claimsSnapshot) {
                existing.claimsSnapshot = detail.claimsSnapshot;
            }
        } else {
            this.step.technicalProfileDetails.push(detail);
        }
        return this;
    }

    /**
     * Adds a selectable option (for HRD/interactive steps).
     */
    addSelectableOption(optionId: string): this {
        if (!this.step.selectableOptions.includes(optionId)) {
            this.step.selectableOptions.push(optionId);
        }
        return this;
    }

    /**
     * Adds multiple selectable options.
     */
    addSelectableOptions(optionIds: string[]): this {
        for (const id of optionIds) {
            this.addSelectableOption(id);
        }
        return this;
    }

    /**
     * Clears all selectable options.
     * Used when a TP is actually triggered, meaning user has made their choice.
     */
    clearSelectableOptions(): this {
        this.step.selectableOptions = [];
        this.step.isInteractiveStep = false;
        return this;
    }

    /**
     * Adds a validation technical profile (used in self-asserted forms).
     */
    addValidationTechnicalProfile(profileId: string): this {
        if (!this.step.validationTechnicalProfiles) {
            this.step.validationTechnicalProfiles = [];
        }
        if (!this.step.validationTechnicalProfiles.includes(profileId)) {
            this.step.validationTechnicalProfiles.push(profileId);
        }
        return this;
    }

    /**
     * Adds a claim mapping from validation technical profile.
     */
    addClaimMapping(mapping: ClaimMapping): this {
        if (!this.step.claimMappings) {
            this.step.claimMappings = [];
        }
        this.step.claimMappings.push(mapping);
        return this;
    }

    /**
     * Adds a claims transformation ID.
     */
    addClaimsTransformation(transformationId: string): this {
        if (!this.step.claimsTransformations.includes(transformationId)) {
            this.step.claimsTransformations.push(transformationId);
        }
        return this;
    }

    /**
     * Adds detailed claims transformation information.
     */
    addClaimsTransformationDetail(detail: ClaimsTransformationDetail): this {
        this.step.claimsTransformationDetails.push(detail);
        if (!this.step.claimsTransformations.includes(detail.id)) {
            this.step.claimsTransformations.push(detail.id);
        }
        return this;
    }

    /**
     * Adds a display control.
     */
    addDisplayControl(controlId: string): this {
        if (!this.step.displayControls.includes(controlId)) {
            this.step.displayControls.push(controlId);
        }
        return this;
    }

    /**
     * Adds a display control action with detailed information.
     */
    addDisplayControlAction(action: DisplayControlAction): this {
        // Also add to displayControls for backwards compatibility
        this.addDisplayControl(action.displayControlId);
        this.step.displayControlActions.push(action);
        return this;
    }

    /**
     * Adds a backend API call detail.
     */
    addBackendApiCall(call: BackendApiCall): this {
        if (!this.step.backendApiCalls) {
            this.step.backendApiCalls = [];
        }
        this.step.backendApiCalls.push(call);
        return this;
    }

    /**
     * Sets the UI settings for this step.
     */
    withUiSettings(settings: UiSettings): this {
        this.step.uiSettings = settings;
        return this;
    }

    /**
     * Sets the submitted claims (from self-asserted form).
     */
    withSubmittedClaims(claims: Record<string, string>): this {
        this.step.submittedClaims = claims;
        return this;
    }

    /**
     * Sets the interaction result.
     */
    withInteractionResult(result: "Continue" | "Cancelled" | "Error"): this {
        this.step.interactionResult = result;
        return this;
    }

    /**
     * Marks this step as a verification step.
     */
    asVerificationStep(): this {
        this.step.isVerificationStep = true;
        return this;
    }

    /**
     * Sets whether this step has a verification context.
     */
    withVerificationContext(hasContext: boolean): this {
        this.step.hasVerificationContext = hasContext;
        return this;
    }

    /**
     * Sets SSO session participant flag.
     */
    withSsoSessionParticipant(isParticipant: boolean): this {
        this.step.ssoSessionParticipant = isParticipant;
        return this;
    }

    /**
     * Sets SSO session activated flag.
     */
    withSsoSessionActivated(isActivated: boolean): this {
        this.step.ssoSessionActivated = isActivated;
        return this;
    }

    /**
     * Sets the previous technical profile from S_CTP.
     */
    withPreviousTechnicalProfile(tpId: string): this {
        this.step.previousTechnicalProfile = tpId;
        return this;
    }

    /**
     * Calculates and sets the graph node ID based on journey context and step order.
     * Format: `{journeyId}-Step{stepOrder}`
     */
    calculateGraphNodeId(): this {
        if (this.step.journeyContextId && this.step.stepOrder > 0) {
            this.step.graphNodeId = `${this.step.journeyContextId}-Step${this.step.stepOrder}`;
        }
        return this;
    }

    /**
     * Builds and returns the TraceStep.
     * Performs validation before returning.
     */
    build(): TraceStep {
        this.validate();
        return structuredClone(this.step);
    }

    /**
     * Returns a reference to the internal step (for mutation during parsing).
     * Use with caution - prefer build() for immutability.
     */
    buildMutable(): TraceStep {
        this.validate();
        return this.step;
    }

    /**
     * Validates the step has required fields.
     */
    private validate(): void {
        if (!this.step.journeyContextId) {
            console.warn("TraceStepBuilder: Missing journeyContextId");
        }
        if (!this.step.graphNodeId && this.step.stepOrder > 0) {
            this.calculateGraphNodeId();
        }
    }
}

/**
 * Factory functions for common step patterns.
 */
export const TraceStepFactory = {
    /**
     * Creates a step for orchestration (initial policy entry).
     */
    createOrchestrationStep(
        sequenceNumber: number,
        timestamp: Date,
        journeyId: string,
        journeyName: string,
        stepOrder: number
    ): TraceStepBuilder {
        return TraceStepBuilder.create()
            .withSequence(sequenceNumber)
            .withTimestamp(timestamp)
            .withEventType("AUTH")
            .withJourneyContext(journeyId, journeyName)
            .withOrchStep(stepOrder)
            .calculateGraphNodeId();
    },

    /**
     * Creates a step for claims exchange (external IdP callback).
     */
    createClaimsExchangeStep(
        sequenceNumber: number,
        timestamp: Date,
        journeyId: string,
        journeyName: string,
        stepOrder: number,
        technicalProfileId: string
    ): TraceStepBuilder {
        return TraceStepBuilder.create()
            .withSequence(sequenceNumber)
            .withTimestamp(timestamp)
            .withEventType("ClaimsExchange")
            .withJourneyContext(journeyId, journeyName)
            .withOrchStep(stepOrder)
            .addTechnicalProfile(technicalProfileId)
            .calculateGraphNodeId();
    },

    /**
     * Creates a step for self-asserted form submission.
     */
    createSelfAssertedStep(
        sequenceNumber: number,
        timestamp: Date,
        journeyId: string,
        journeyName: string,
        stepOrder: number,
        technicalProfileId: string
    ): TraceStepBuilder {
        return TraceStepBuilder.create()
            .withSequence(sequenceNumber)
            .withTimestamp(timestamp)
            .withEventType("SELFASSERTED")
            .withJourneyContext(journeyId, journeyName)
            .withOrchStep(stepOrder)
            .addTechnicalProfile(technicalProfileId)
            .asInteractiveStep()
            .calculateGraphNodeId();
    },

    /**
     * Creates a step for HRD (identity provider selection).
     */
    createHrdStep(
        sequenceNumber: number,
        timestamp: Date,
        journeyId: string,
        journeyName: string,
        stepOrder: number,
        selectableProviders: string[]
    ): TraceStepBuilder {
        return TraceStepBuilder.create()
            .withSequence(sequenceNumber)
            .withTimestamp(timestamp)
            .withEventType("API")
            .withJourneyContext(journeyId, journeyName)
            .withOrchStep(stepOrder)
            .addSelectableOptions(selectableProviders)
            .asInteractiveStep()
            .calculateGraphNodeId();
    },
};

/**
 * GetClaims Interpreter
 *
 * Handles GetRelyingPartyInputClaimsHandler, which fires on GetClaims-type
 * orchestration steps. This handler extracts claims from an id_token_hint JWT
 * passed by the relying party to the B2C policy.
 *
 * The step itself is already created by OrchestrationInterpreter (ORCH_CS change).
 * This interpreter contributes a GetClaims child FlowNode to that step, carrying
 * the extracted claims and validation status.
 */

import { BaseInterpreter, type InterpretContext, type InterpretResult } from "./base-interpreter";
import { GET_RELYING_PARTY_INPUT_CLAIMS } from "../constants/handlers";
import { StatebagKey } from "../constants/keys";
import { FlowNodeType, type FlowNodeChild } from "@/types/flow-node";

export class GetClaimsInterpreter extends BaseInterpreter {
    readonly handlerNames = [GET_RELYING_PARTY_INPUT_CLAIMS] as const;

    interpret(context: InterpretContext): InterpretResult {
        const { handlerResult, claims } = context;

        if (!handlerResult) {
            return this.successNoOp();
        }

        const statebagUpdates = this.extractStatebagFromResult(handlerResult);
        const claimsUpdates = this.extractClaimsFromResult(handlerResult);

        const extractedClaims = this.parseExtractedClaims(handlerResult, claims);
        const complexItems = this.extractComplexItems(handlerResult);
        const idTokenHintValidated = complexItems?.includes("ITH_V") ?? false;

        const gcChild: FlowNodeChild = {
            data: {
                type: FlowNodeType.GetClaims,
                result: handlerResult.Result === true,
                claimsSource: "id_token_hint",
                idTokenHintValidated,
                extractedClaims,
                complexItems: complexItems ?? undefined,
            },
        };

        return this.successNoOp({
            statebagUpdates,
            claimsUpdates,
            flowChildren: [gcChild],
        });
    }

    private parseExtractedClaims(
        handlerResult: NonNullable<InterpretContext["handlerResult"]>,
        previousClaims: InterpretContext["claims"],
    ): ReadonlyArray<{ claimType: string; value: string }> {
        const complexClms = handlerResult.Statebag?.[StatebagKey.ComplexClaims];
        if (!complexClms || typeof complexClms !== "object") return [];

        return Object.entries(complexClms as Record<string, unknown>)
            .map(([claimType, value]) => ({
                claimType,
                value: String(value),
            }))
            .filter(({ claimType, value }) => previousClaims[claimType] !== value);
    }

    private extractComplexItems(
        handlerResult: NonNullable<InterpretContext["handlerResult"]>,
    ): string | null {
        const raw = handlerResult.Statebag?.[StatebagKey.ComplexItems];
        if (typeof raw === "string") return raw;
        if (raw && typeof raw === "object" && "v" in raw) {
            return (raw as { v: string }).v ?? null;
        }
        return null;
    }
}

export function createGetClaimsInterpreter(): GetClaimsInterpreter {
    return new GetClaimsInterpreter();
}

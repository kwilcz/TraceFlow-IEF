import React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { DisplayControl } from "@/types/technical-profile";
import { ClaimItem, DisplayControlItem } from "@/components/nodeTypes/node-claim-components";
import { ClickableReference } from "../shared";

const DisplayControlDetail: React.FC<{ control: DisplayControl; className?: string }> = ({ control, className }) => (
    <div className={cn("bg-purple-900/20 rounded-lg p-3 space-y-2 border border-purple-500/30", className)}>
        <div className="flex items-center justify-between">
            <DisplayControlItem control={control} showLabel={true} />
            <Badge className="bg-purple-800/40 text-purple-200 text-[10px]">{control.userInterfaceControlType}</Badge>
        </div>

        {control.inputClaims && control.inputClaims.length > 0 && (
            <div>
                <p className="text-xs font-semibold text-purple-300 mb-1">Input Claims</p>
                <div className="space-y-1">
                    {control.inputClaims.map((claim, idx) => (
                        <ClaimItem key={idx} claim={claim} color="blue" />
                    ))}
                </div>
            </div>
        )}

        {control.displayClaims && control.displayClaims.length > 0 && (
            <div>
                <p className="text-xs font-semibold text-purple-300 mb-1">Display Claims</p>
                <div className="space-y-1">
                    {control.displayClaims.map((claim, idx) => (
                        <ClaimItem key={idx} claim={claim} color="blue" />
                    ))}
                </div>
            </div>
        )}

        {control.outputClaims && control.outputClaims.length > 0 && (
            <div>
                <p className="text-xs font-semibold text-purple-300 mb-1">Output Claims</p>
                <div className="space-y-1">
                    {control.outputClaims.map((claim, idx) => (
                        <ClaimItem key={idx} claim={claim} color="green" />
                    ))}
                </div>
            </div>
        )}

        {control.actions && control.actions.length > 0 && (
            <div>
                <p className="text-xs font-semibold text-purple-300 mb-1">Actions</p>
                <div className="space-y-2">
                    {control.actions.map((action, idx) => (
                        <div key={idx} className="bg-purple-800/30 rounded p-2">
                            <p className="text-xs text-purple-200 font-mono">{action.id}</p>
                            {action.validationClaimsExchange && action.validationClaimsExchange.length > 0 && (
                                <div className="mt-1 space-y-1">
                                    {action.validationClaimsExchange.map((vce, vceIdx) => (
                                        <ClickableReference
                                            key={vceIdx}
                                            value={vce.technicalProfileReferenceId}
                                            type="technicalProfile"
                                            label="Validation TP"
                                            color="purple"
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
);

export { DisplayControlDetail };

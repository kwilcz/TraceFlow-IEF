import React from "react";
import type { DisplayControl } from "@/types/technical-profile";
import { DetailsCard } from "../details-card";
import { DisplayControlDetail } from "./display-control-detail";

const DisplayControlsSection: React.FC<{ displayControls: DisplayControl[]; className?: string }> = ({ displayControls, className }) => (
    <DetailsCard.Section title={`Display Controls (${displayControls.length})`} className={className}>
        <div className="max-h-96 overflow-y-auto pr-2">
            <div className="space-y-3">
                {displayControls.map((control, idx) => (
                    <DisplayControlDetail key={idx} control={control} />
                ))}
            </div>
        </div>
    </DetailsCard.Section>
);

export { DisplayControlsSection };

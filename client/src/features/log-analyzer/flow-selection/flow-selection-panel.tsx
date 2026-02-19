import * as card from "@/components/ui/card";
import * as scrollArea from "@/components/ui/scroll-area";
import type { UserFlow } from "@/types/trace";
import { FlowSelectionTable } from "./flow-selection-table";

interface FlowSelectionPanelProps {
    userFlows: UserFlow[];
    selectedFlow: UserFlow | null;
    onSelectFlow: (flow: UserFlow) => void;
}

/**
 * Table card for the flow-selection feature.
 * Renders the full-width table inside a Card.
 */
export function FlowSelectionPanel({ userFlows, selectedFlow, onSelectFlow }: FlowSelectionPanelProps) {
    return (
        <card.Card className="w-full">
            <card.CardContent>
                <scrollArea.Root>
                    <scrollArea.Viewport className="max-h-[40vh] w-full rounded-xl">
                        <scrollArea.Content>
                            <FlowSelectionTable
                                userFlows={userFlows}
                                selectedFlow={selectedFlow}
                                onSelectFlow={onSelectFlow}
                            />
                        </scrollArea.Content>
                    </scrollArea.Viewport>
                    <scrollArea.ScrollBar orientation="vertical" className="w-2" />
                    <scrollArea.ScrollAreaCorner />
                </scrollArea.Root>
            </card.CardContent>
        </card.Card>
    );
}

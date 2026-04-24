import { CaretDownIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { LogCredentialEnvironment } from "@/types/logs";

type EnvironmentPickerProps = {
    environments: LogCredentialEnvironment[];
    activeEnvironmentId: string | null;
    onSelectEnvironment: (environmentId: string) => void;
    onManageEnvironments: () => void;
};

export const EnvironmentPicker = ({
    environments,
    activeEnvironmentId,
    onSelectEnvironment,
    onManageEnvironments,
}: EnvironmentPickerProps) => {
    const activeEnvironment = environments.find((environment) => environment.id === activeEnvironmentId) ?? null;
    const triggerLabel = activeEnvironment?.name ?? "Select environment";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="xs" className="justify-between rounded-full px-3">
                    <span className="truncate">{triggerLabel}</span>
                    <CaretDownIcon className="shrink-0" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                <DropdownMenuLabel>Environment</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                    value={activeEnvironmentId ?? ""}
                    onValueChange={(value) => {
                        if (value) {
                            onSelectEnvironment(value);
                        }
                    }}
                >
                    {environments.map((environment) => (
                        <DropdownMenuRadioItem key={environment.id} value={environment.id}>
                            {environment.name}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onManageEnvironments}>⚙ Environments</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

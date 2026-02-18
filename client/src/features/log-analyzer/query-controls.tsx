import React from "react";
import { useShallow } from "zustand/react/shallow";
import { CaretDownIcon, GearIcon, MagnifyingGlassIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import * as card from "@/components/ui/card";
import * as Field from "@/components/ui/field";
import { Button } from "@components/ui/button.tsx";
import { Input } from "@components/ui/input.tsx";
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
import { LOG_LIMITS, TIMESPAN_OPTIONS } from "@/constants/log-analyzer.constants";
import { clampRowCount, validateIsoDuration } from "@/lib/validators/log-validators";
import { useLogStore } from "@/stores/log-store";

/** Props for the {@link QueryControls} component. */
export type QueryControlsProps = {
    /** Opens the credentials dialog so the user can change connection settings. */
    onOpenSettings: () => void;
};

type QueryDraftState = {
    maxRowsInput: string | null;
    timespanChoice: string | null;
    customTimespan: string | null;
    searchText: string | null;
    timespanTouched: boolean;
};

type QueryDraftAction =
    | { type: "set-max-rows-input"; value: string }
    | { type: "set-timespan-choice"; value: string }
    | { type: "set-custom-timespan"; value: string }
    | { type: "set-search-text"; value: string }
    | { type: "set-timespan-touched"; value: boolean };

const initialDraftState: QueryDraftState = {
    maxRowsInput: null,
    timespanChoice: null,
    customTimespan: null,
    searchText: null,
    timespanTouched: false,
};

const queryDraftReducer = (state: QueryDraftState, action: QueryDraftAction): QueryDraftState => {
    switch (action.type) {
        case "set-max-rows-input":
            return { ...state, maxRowsInput: action.value };
        case "set-timespan-choice":
            return {
                ...state,
                timespanChoice: action.value,
                timespanTouched: action.value === "custom" ? state.timespanTouched : false,
            };
        case "set-custom-timespan":
            return {
                ...state,
                customTimespan: action.value,
                timespanChoice: "custom",
            };
        case "set-search-text":
            return { ...state, searchText: action.value };
        case "set-timespan-touched":
            return { ...state, timespanTouched: action.value };
        default:
            return state;
    }
};

/**
 * Resolves whether a timespan value matches a preset option.
 * @returns The matching preset value, or "custom" if none match.
 */
const resolveTimespanChoice = (timespan: string): { choice: string; custom: string } => {
    const normalized = timespan || "P1D";
    const isPreset = TIMESPAN_OPTIONS.some((opt) => opt.value === normalized);
    return isPreset ? { choice: normalized, custom: "" } : { choice: "custom", custom: normalized };
};

/**
 * Derives a human-readable label for the current timespan selection.
 */
const getTimespanLabel = (choice: string, customValue: string): string => {
    if (choice === "custom") return customValue || "Custom";
    return TIMESPAN_OPTIONS.find((opt) => opt.value === choice)?.label ?? choice;
};

/**
 * Query controls toolbar for the log analyzer workspace.
 *
 * Renders a search input, timespan chip dropdown, max-rows chip dropdown,
 * and a credentials settings button in a responsive grid layout.
 */
export const QueryControls = ({ onOpenSettings }: QueryControlsProps) => {
    const { fetchLogs, setSearchText, isLoading, credentials, preferences, searchText } = useLogStore(
        useShallow((state) => ({
            fetchLogs: state.fetchLogs,
            setSearchText: state.setSearchText,
            isLoading: state.isLoading,
            credentials: state.credentials,
            preferences: state.preferences,
            searchText: state.searchText,
        })),
    );

    const [draftState, dispatch] = React.useReducer(queryDraftReducer, initialDraftState);
    const [isTimespanMenuOpen, setTimespanMenuOpen] = React.useState(false);

    const resolvedStoreTimespan = resolveTimespanChoice(preferences.timespan);
    const maxRowsInput = draftState.maxRowsInput ?? String(preferences.maxRows || LOG_LIMITS.DEFAULT_ROWS);
    const timespanChoice = draftState.timespanChoice ?? resolvedStoreTimespan.choice;
    const customTimespan = draftState.customTimespan ?? resolvedStoreTimespan.custom;
    const localSearchText = draftState.searchText ?? (searchText || "");

    // Derived validation state — calculated during render.
    const effectiveTimespan = (timespanChoice === "custom" ? customTimespan : timespanChoice).toUpperCase();
    const isTimespanValid = timespanChoice !== "custom" || validateIsoDuration(effectiveTimespan);
    const maxRows = clampRowCount(Number.parseInt(maxRowsInput, 10), LOG_LIMITS.MIN_ROWS, LOG_LIMITS.MAX_ROWS);
    const timespanChipLabel = getTimespanLabel(timespanChoice, customTimespan);
    const showTimespanValidation = timespanChoice === "custom" && !isTimespanValid && draftState.timespanTouched;
    const canRunQuery =
        Boolean(credentials.applicationId.trim()) &&
        Boolean(credentials.apiKey.trim()) &&
        isTimespanValid &&
        !isLoading;

    const handleRunQuery = async () => {
        dispatch({ type: "set-timespan-touched", value: true });
        if (!canRunQuery) return;
        if (timespanChoice === "custom" && !validateIsoDuration(effectiveTimespan)) return;

        setSearchText(localSearchText);
        await fetchLogs({
            applicationId: credentials.applicationId.trim(),
            apiKey: credentials.apiKey.trim(),
            maxRows,
            timespan: effectiveTimespan,
        });
    };

    return (
        <card.Card className="w-full max-w-full min-[1200px]:max-w-[75vw] p-4 md:p-6 gap-5">
            <card.CardContent className="w-full">
                <div className="grid w-full grid-cols-[auto_1fr] items-center gap-3 min-[1200px]:grid-cols-[auto_minmax(0,1fr)_auto] min-[1200px]:gap-4">
                    <div className="col-start-1 row-start-2 justify-self-start min-[1200px]:row-start-1">
                        <Button variant="secondary" size="xs" onClick={onOpenSettings}>
                            <GearIcon />
                            Credentials
                        </Button>
                    </div>

                    <div className="col-span-2 w-full justify-self-stretch min-[1200px]:col-span-1 min-[1200px]:col-start-2 min-[1200px]:max-w-xl min-[1200px]:justify-self-center">
                        <div className="relative">
                            <Input
                                className="pr-12"
                                value={localSearchText}
                                onChange={(event) =>
                                    dispatch({ type: "set-search-text", value: event.target.value })
                                }
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        void handleRunQuery();
                                    }
                                }}
                                placeholder="Search by correlation ID, email, or user ID"
                            />
                            <Button
                                variant="outline"
                                size="icon-md"
                                className="rounded-xl absolute right-0 top-1/2 -translate-y-1/2"
                                onClick={() => void handleRunQuery()}
                                disabled={!canRunQuery}
                                aria-label="Search"
                            >
                                {isLoading ? <SpinnerGapIcon className="animate-spin" /> : <MagnifyingGlassIcon />}
                            </Button>
                        </div>
                    </div>

                    <div className="col-start-2 row-start-2 flex flex-wrap items-center justify-end gap-2 min-[1200px]:col-start-3 min-[1200px]:row-start-1">
                        {/* Timespan chip dropdown */}
                        <DropdownMenu
                            open={isTimespanMenuOpen}
                            onOpenChange={(nextOpen) => {
                                if (!nextOpen && timespanChoice === "custom" && !isTimespanValid) {
                                    dispatch({ type: "set-timespan-touched", value: true });
                                    setTimespanMenuOpen(true);
                                    return;
                                }
                                setTimespanMenuOpen(nextOpen);
                            }}
                        >
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="xs" className="w-52 justify-between rounded-full px-3">
                                    <span className="truncate">Timespan: {timespanChipLabel}</span>
                                    <CaretDownIcon className="shrink-0" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center">
                                <DropdownMenuLabel>Timespan</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuRadioGroup
                                    value={timespanChoice}
                                    onValueChange={(value) => {
                                        if (!value) return;
                                        dispatch({ type: "set-timespan-choice", value });
                                        setTimespanMenuOpen(false);
                                    }}
                                >
                                    {TIMESPAN_OPTIONS.map((option) => (
                                        <DropdownMenuRadioItem key={option.value} value={option.value}>
                                            {option.label}
                                        </DropdownMenuRadioItem>
                                    ))}
                                </DropdownMenuRadioGroup>
                                <DropdownMenuSeparator />
                                <div className="px-2 pb-2">
                                    <Field.Root name="customTimespan">
                                        <Field.Control
                                            render={
                                                <Input
                                                    tabIndex={-1}
                                                    value={customTimespan}
                                                    placeholder="PT2H30M"
                                                    aria-invalid={showTimespanValidation}
                                                    className={showTimespanValidation ? "border-destructive" : undefined}
                                                    onKeyDown={(event) => event.stopPropagation()}
                                                    onFocus={() =>
                                                        dispatch({ type: "set-timespan-choice", value: "custom" })
                                                    }
                                                    onBlur={() => dispatch({ type: "set-timespan-touched", value: true })}
                                                    onChange={(event) => {
                                                        dispatch({
                                                            type: "set-custom-timespan",
                                                            value: event.target.value.toUpperCase(),
                                                        });
                                                    }}
                                                />
                                            }
                                            required
                                            pattern="^P(?!$)(\\d+Y)?(\\d+M)?(\\d+W)?(\\d+D)?(T(\\d+H)?(\\d+M)?(\\d+S)?)?$"
                                        />
                                        {showTimespanValidation ? (
                                            <Field.Error>Provide a valid ISO 8601 duration.</Field.Error>
                                        ) : null}
                                    </Field.Root>
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Max rows chip dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="xs" className="w-35 justify-between rounded-full px-3">
                                    <span className="text-ellipsis truncate">Max Rows: {maxRows}</span>
                                    <CaretDownIcon className="shrink-0" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center" >
                                <DropdownMenuLabel>Max Rows</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {[LOG_LIMITS.DEFAULT_ROWS, 100, 250, LOG_LIMITS.MAX_ROWS]
                                    .filter((value, index, values) => values.indexOf(value) === index)
                                    .map((value) => (
                                        <DropdownMenuItem
                                            key={value}
                                            onClick={() =>
                                                dispatch({ type: "set-max-rows-input", value: String(value) })
                                            }
                                        >
                                            {value} rows
                                        </DropdownMenuItem>
                                    ))}
                                <DropdownMenuSeparator />
                                <div className="px-2 pb-2">
                                    <Input
                                        tabIndex={-1}
                                        type="number"
                                        min={LOG_LIMITS.MIN_ROWS}
                                        max={LOG_LIMITS.MAX_ROWS}
                                        value={maxRowsInput}
                                        onKeyDown={(event) => event.stopPropagation()}
                                        onChange={(event) =>
                                            dispatch({ type: "set-max-rows-input", value: event.target.value })
                                        }
                                    />
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

            </card.CardContent>
        </card.Card>
    );
};

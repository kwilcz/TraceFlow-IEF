"use client";

import React, { ChangeEvent, useEffect, useState } from "react";
import { AlertCircle, Loader2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLogStore, type ExtendedLogStore } from "@/stores/log-store";
import { useCredentialPersistence } from "@/hooks/use-credential-persistence";
import { validateGuid, validateIsoDuration, clampRowCount } from "@/lib/validators/log-validators";
import { TIMESPAN_OPTIONS, LOG_LIMITS } from "@/constants/log-analyzer.constants";
import { Checkbox } from "../ui/checkbox";

interface CredentialInputProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    type?: string;
    placeholder?: string;
    error?: boolean;
    errorMessage?: string;
}

const CredentialInput = ({
    id,
    label,
    value,
    onChange,
    onBlur,
    type = "text",
    placeholder,
    error,
    errorMessage,
}: CredentialInputProps) => (
    <div className="space-y-2">
        <label htmlFor={id} className="text-sm font-medium">
            {label}
        </label>
        <Input
            id={id}
            type={type}
            value={value}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            autoComplete="off"
        />
        {error && errorMessage && (
            <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> {errorMessage}
            </p>
        )}
    </div>
);

interface TimespanSelectorProps {
    value: string;
    customValue: string;
    onValueChange: (value: string) => void;
    onCustomValueChange: (value: string) => void;
    onCustomBlur: () => void;
    showError: boolean;
}

const TimespanSelector = ({
    value,
    customValue,
    onValueChange,
    onCustomValueChange,
    onCustomBlur,
    showError,
}: TimespanSelectorProps) => {
    const isCustom = value === "custom";

    return (
        <div className="space-y-2">
            <label htmlFor="timespan" className="text-sm font-medium">
                Timespan
            </label>
            <select
                id="timespan"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={value}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => onValueChange(event.target.value)}
            >
                {TIMESPAN_OPTIONS.map((option) => (
                    <option value={option.value} key={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {isCustom && (
                <>
                    <Input
                        className="mt-2"
                        placeholder="Example: PT2H30M"
                        value={customValue}
                        onBlur={onCustomBlur}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                            onCustomValueChange(event.target.value.toUpperCase())
                        }
                    />
                    {showError && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5" /> Provide a valid ISO 8601 duration.
                        </p>
                    )}
                </>
            )}
        </div>
    );
};

interface LastUpdatedStatusProps {
    lastUpdated: Date | null;
}

const LastUpdatedStatus = ({ lastUpdated }: LastUpdatedStatusProps) => (
    <div className="text-xs text-muted-foreground">
        {lastUpdated ? `Last refreshed ${lastUpdated.toLocaleString()}` : "No data pulled yet."}
    </div>
);

interface ErrorAlertProps {
    message: string;
}

const ErrorAlert = ({ message }: ErrorAlertProps) => (
    <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4" />
        <span>{message}</span>
    </div>
);

export const LogCredentialsForm = () => {
    const fetchLogs = useLogStore((state) => state.fetchLogs);
    const isLoading = useLogStore((state) => state.isLoading);
    const error = useLogStore((state) => state.error);
    const lastUpdated = useLogStore((state) => state.lastUpdated);
    const credentials = useLogStore((state) => state.credentials);
    const preferences = useLogStore((state) => state.preferences);
    const setCredentials = useLogStore((state) => state.setCredentials);
    const searchText = useLogStore((state: ExtendedLogStore) => state.searchText);
    const setSearchText = useLogStore((state: ExtendedLogStore) => state.setSearchText);

    const { shouldSave, setShouldSave, loadCredentials, saveCredentials, clearCredentials } =
        useCredentialPersistence();

    const [applicationId, setApplicationId] = useState(credentials.applicationId || "");
    const [apiKey, setApiKey] = useState(credentials.apiKey || "");
    const [maxRows, setMaxRows] = useState(preferences.maxRows || LOG_LIMITS.DEFAULT_ROWS);
    const [localSearchText, setLocalSearchText] = useState(searchText);
    const [timespanChoice, setTimespanChoice] = useState(
        TIMESPAN_OPTIONS.some((opt) => opt.value === preferences.timespan) ? preferences.timespan : "custom"
    );
    const [customTimespan, setCustomTimespan] = useState(
        TIMESPAN_OPTIONS.some((opt) => opt.value === preferences.timespan) ? "" : preferences.timespan || ""
    );
    const [appIdTouched, setAppIdTouched] = useState(false);
    const [timespanTouched, setTimespanTouched] = useState(false);

    useEffect(() => {
        const stored = loadCredentials();
        if (stored) {
            setApplicationId(stored.applicationId ?? "");
            setApiKey(stored.apiKey ?? "");
            setCredentials({
                applicationId: stored.applicationId ?? "",
                apiKey: stored.apiKey ?? "",
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        setApplicationId(credentials.applicationId || "");
        setApiKey(credentials.apiKey || "");
        setMaxRows(preferences.maxRows || LOG_LIMITS.DEFAULT_ROWS);

        const timespanFromStore = preferences.timespan || "P1D";
        if (TIMESPAN_OPTIONS.some((option) => option.value === timespanFromStore)) {
            setTimespanChoice(timespanFromStore);
            setCustomTimespan("");
        } else {
            setTimespanChoice("custom");
            setCustomTimespan(timespanFromStore);
        }
    }, [credentials.applicationId, credentials.apiKey, preferences.maxRows, preferences.timespan]);

    const usingCustomTimespan = timespanChoice === "custom";
    const effectiveTimespan = (usingCustomTimespan ? customTimespan : timespanChoice).toUpperCase();
    const isGuidValid = validateGuid(applicationId);
    const isCustomTimespanValid = !usingCustomTimespan || validateIsoDuration(effectiveTimespan);
    const boundedRows = clampRowCount(maxRows, LOG_LIMITS.MIN_ROWS, LOG_LIMITS.MAX_ROWS);
    const canSubmit = Boolean(apiKey.trim()) && isGuidValid && isCustomTimespanValid;

    const handleSaveCredentialsToggle = (checked: boolean) => {
        setShouldSave(checked);
        if (!checked) {
            clearCredentials();
        }
    };

    const handleRefresh = async () => {
        setAppIdTouched(true);
        setTimespanTouched(true);

        if (!canSubmit) return;

        // Update store search text before fetching
        setSearchText(localSearchText);

        await fetchLogs({
            applicationId: applicationId.trim(),
            apiKey: apiKey.trim(),
            maxRows: boundedRows,
            timespan: effectiveTimespan,
        });

        saveCredentials({ applicationId: applicationId.trim(), apiKey: apiKey.trim() });

        const latestState = useLogStore.getState();
        if (latestState.error) {
            toast.error("Failed to refresh telemetry. Review your credentials or query filters.");
        } else {
            const flowCount = latestState.userFlows.length;
            const logCount = latestState.logs.length;
            toast.success(`Loaded ${flowCount} flow${flowCount === 1 ? "" : "s"} (${logCount} log${logCount === 1 ? "" : "s"}).`);
        }
    };

    const handleMaxRowsChange = (value: string) => {
        const parsed = parseInt(value, 10);
        if (Number.isNaN(parsed)) {
            setMaxRows(LOG_LIMITS.MIN_ROWS);
            return;
        }
        setMaxRows(clampRowCount(parsed, LOG_LIMITS.MIN_ROWS, LOG_LIMITS.MAX_ROWS));
    };

    return (
        <Card className="h-full">
            <CardHeader className="space-y-1">
                <CardTitle>Source & Credentials</CardTitle>
                <CardDescription>
                    Authenticate against Application Insights or upload a raw export to inspect recorder events.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
                <Tabs defaultValue="api" className="mt-2 w-full">
                    <TabsList>
                        <TabsTrigger value="api">Application Insights API</TabsTrigger>
                        <TabsTrigger value="raw" disabled className="text-muted-foreground/70">
                            Raw File
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="api" className="mt-4">
                        <div className="space-y-5">
                            <CredentialInput
                                id="applicationId"
                                label="Application ID"
                                value={applicationId}
                                onChange={setApplicationId}
                                onBlur={() => setAppIdTouched(true)}
                                placeholder="00000000-0000-0000-0000-000000000000"
                                error={!isGuidValid && appIdTouched}
                                errorMessage="Provide a valid GUID."
                            />
                            <CredentialInput
                                id="apiKey"
                                label="Application Key"
                                value={apiKey}
                                onChange={setApiKey}
                                type="password"
                                placeholder="Read-only API key"
                            />
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label htmlFor="maxRows" className="text-sm font-medium">
                                        Max Rows
                                    </label>
                                    <Input
                                        id="maxRows"
                                        type="number"
                                        min={LOG_LIMITS.MIN_ROWS}
                                        max={LOG_LIMITS.MAX_ROWS}
                                        value={maxRows}
                                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                            handleMaxRowsChange(event.target.value)
                                        }
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Between {LOG_LIMITS.MIN_ROWS} and {LOG_LIMITS.MAX_ROWS} rows.
                                    </p>
                                </div>
                                <TimespanSelector
                                    value={timespanChoice}
                                    customValue={customTimespan}
                                    onValueChange={(value) => {
                                        setTimespanChoice(value);
                                        if (value !== "custom") {
                                            setTimespanTouched(false);
                                        }
                                    }}
                                    onCustomValueChange={setCustomTimespan}
                                    onCustomBlur={() => setTimespanTouched(true)}
                                    showError={!isCustomTimespanValid && timespanTouched}
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="searchText" className="text-sm font-medium">
                                    Search (optional)
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="searchText"
                                        type="text"
                                        value={localSearchText}
                                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                            setLocalSearchText(event.target.value)
                                        }
                                        placeholder="Search by email, user ID, correlation ID..."
                                        className="pl-10"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Search for any text in the logs. Complete flows will be fetched for matching entries.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="saveCredentials"
                                    checked={shouldSave}
                                    onCheckedChange={(checked) => handleSaveCredentialsToggle(!!checked)}
                                />
                                <label htmlFor="saveCredentials" className="text-sm text-muted-foreground">
                                    Save credentials
                                </label>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Credentials do not leave your browser, and are stored securely in local storage.
                            </p>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <LastUpdatedStatus lastUpdated={lastUpdated} />
                                <Button
                                    onClick={handleRefresh}
                                    disabled={!canSubmit || isLoading}
                                    className="w-full sm:w-auto"
                                >
                                    {isLoading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                    )}
                                    Refresh Data
                                </Button>
                            </div>
                            {error && <ErrorAlert message={error} />}
                        </div>
                    </TabsContent>
                    <TabsContent value="raw" className="mt-4">
                        <div className="rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground">
                            Raw export ingestion is on the roadmap. For now, use the Application Insights API to query
                            traces directly.
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

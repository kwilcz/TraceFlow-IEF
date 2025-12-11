/**
 * UI Settings Interpreter
 *
 * Handles ApiUiManager and extracts UI configuration from B2C traces.
 *
 * The ApiUiManagerInfo contains:
 * - Language: JSON string with localized UI strings
 * - Settings: JSON string with page configuration
 *   - api: Page type (CombinedSigninAndSignup, SelfAsserted, etc.)
 *   - remoteResource: URL for custom UI template
 *   - config: Page-specific settings (showSignupLink, operatingMode, etc.)
 *   - locale: Language settings
 *   - tenantBranding: Branding configuration
 *
 * The EID statebag contains the content definition URN.
 */

import type {
    HandlerResultContent,
    RecorderRecordEntry,
} from "@/types/journey-recorder";
import type { UiSettings } from "@/types/trace";
import { BaseInterpreter, type InterpretContext, type InterpretResult } from "./base-interpreter";
import { API_UI_MANAGER } from "../constants/handlers";

/**
 * Interprets ApiUiManager action clips and extracts UI settings.
 */
export class UiSettingsInterpreter extends BaseInterpreter {
    readonly handlerNames = [API_UI_MANAGER];

    interpret(context: InterpretContext): InterpretResult {
        const { handlerResult, statebag } = context;

        if (!handlerResult) {
            return this.successNoOp();
        }

        const statebagUpdates = this.extractStatebagFromResult(handlerResult);
        const claimsUpdates = this.extractClaimsFromResult(handlerResult);

        // Merge context statebag with updates for content definition extraction
        const mergedStatebag = { ...statebag, ...statebagUpdates };
        const uiSettings = this.extractUiSettings(handlerResult, mergedStatebag);

        if (!uiSettings) {
            return this.successNoOp({ statebagUpdates, claimsUpdates });
        }

        return this.successNoOp({
            statebagUpdates,
            claimsUpdates,
            uiSettings,
        });
    }

    /**
     * Extracts UI settings from ApiUiManagerInfo recorder record and statebag.
     */
    private extractUiSettings(
        handlerResult: HandlerResultContent,
        statebagUpdates: Record<string, string>
    ): UiSettings | undefined {
        const recorderRecord = handlerResult.RecorderRecord;
        
        const uiSettings: UiSettings = {};

        // Extract content definition from EID statebag
        if (statebagUpdates.EID) {
            uiSettings.contentDefinition = statebagUpdates.EID;
        }

        // Extract from ApiUiManagerInfo
        if (recorderRecord?.Values) {
            const apiUiManagerInfo = recorderRecord.Values.find(
                (v) => v.Key === "ApiUiManagerInfo"
            );

            if (apiUiManagerInfo?.Value) {
                this.parseApiUiManagerInfo(apiUiManagerInfo.Value, uiSettings);
            }
        }

        return Object.keys(uiSettings).length > 0 ? uiSettings : undefined;
    }

    /**
     * Parses the nested ApiUiManagerInfo structure.
     */
    private parseApiUiManagerInfo(value: RecorderRecordEntry["Value"], uiSettings: UiSettings): void {
        // The Value has a nested Values array with Key/Value pairs
        if (typeof value !== "object" || !value) {
            return;
        }

        const valueObj = value as { Values?: Array<{ Key: string; Value: string }> };
        if (!Array.isArray(valueObj.Values)) {
            return;
        }

        for (const item of valueObj.Values) {
            if (item.Key === "Settings") {
                this.parsePageSettings(item.Value, uiSettings);
            }
        }
    }

    /**
     * Parses the Settings JSON string.
     */
    private parsePageSettings(jsonStr: string, uiSettings: UiSettings): void {
        try {
            const settings = JSON.parse(jsonStr);

            // Extract page type from api field
            if (settings.api) {
                uiSettings.pageType = settings.api;
            }

            // Extract remote resource URL
            if (settings.remoteResource) {
                uiSettings.remoteResource = settings.remoteResource;
            }

            // Extract page view ID as page ID
            if (settings.pageViewId) {
                uiSettings.pageId = settings.pageViewId;
            }

            // Extract language from locale
            if (settings.locale?.lang) {
                uiSettings.language = settings.locale.lang;
            }

            // Extract config
            if (settings.config && typeof settings.config === "object") {
                uiSettings.config = { ...settings.config };
            }

            // Extract tenant branding
            if (settings.tenantBranding) {
                uiSettings.tenantBranding = {
                    bannerLogoUrl: settings.tenantBranding.bannerLogoUrl,
                    backgroundColor: settings.tenantBranding.backgroundColor,
                };
            }
        } catch (error) {
            // Log parse errors for debugging but don't fail the interpretation
            console.warn('[UiSettingsInterpreter] Failed to parse page settings JSON:', error);
        }
    }
}

/**
 * Factory function for creating UiSettingsInterpreter instances.
 */
export function createUiSettingsInterpreter(): UiSettingsInterpreter {
    return new UiSettingsInterpreter();
}

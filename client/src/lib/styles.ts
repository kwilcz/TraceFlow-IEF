/**
 * Shared style constants for utility-first component styling.
 * These replace @apply with @utility antipattern.
 *
 * Naming convention:
 * - focus* - Focus state styles
 * - disabled* - Disabled state styles
 * - transition* - Animation/transition styles
 * - interactive* - Interactive element patterns
 * - popup* - Popup/overlay patterns
 */

import { cn } from "./utils";

// =============================================================================
// FOCUS STATES
// =============================================================================

/** Standard focus ring for interactive elements (buttons, checkboxes, etc.) */
export const focusRing = cn(
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
);

/** Focus ring using data-[focus-visible] attribute (Base UI components) */
export const focusRingData = cn(
    "data-[focus-visible=true]:ring-2 data-[focus-visible=true]:ring-ring data-[focus-visible=true]:ring-offset-2 data-[focus-visible=true]:ring-offset-background",
);

/** Subtle focus ring for form fields */
export const focusRingField = cn("focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-0");

/** Combined focus ring (native + data attribute) */
export const focusRingCombined = cn(focusRing, focusRingData);

// =============================================================================
// DISABLED STATES
// =============================================================================

/** Disabled state for native HTML elements */
export const disabledState = cn("disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed");

/** Disabled state using data-[disabled] attribute (Base UI components) */
export const dataDisabledState = cn(
    "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed",
);

/** Disabled state using aria-disabled attribute */
export const ariaDisabledState = cn("aria-disabled:pointer-events-none aria-disabled:opacity-50");

/** Combined disabled states (native + data + aria) */
export const disabledAll = cn(disabledState, dataDisabledState, ariaDisabledState);

// ============================================================================
// INVALID STATES
// =============================================================================

export const invalidRing = cn(
    "data-[invalid=true]:ring-2 data-[invalid=true]:ring-destructive aria-invalid:ring-2 aria-invalid:ring-destructive",
);

// =============================================================================
// TRANSITIONS
// =============================================================================

/** Fast color transition (150ms) */
export const transitionColors = cn("transition-colors duration-150 motion-reduce:transition-none");

/** Fast all-property transition (150ms) */
export const transitionAll = cn("transition-all duration-150 motion-reduce:transition-none");

/** Smooth all-property transition (250ms, ease-out) */
export const transitionSmooth = cn("transition-all duration-250 ease-out motion-reduce:transition-none");

// =============================================================================
// INTERACTIVE ELEMENTS
// =============================================================================

/** Base interactive cursor and selection */
export const interactiveBase = cn("cursor-pointer select-none");

/** Mobile tap highlight removal */
export const noHighlight = cn("no-highlight");

/** Press/active scale effect */
export const pressedScale = cn("active:scale-[0.97] data-[pressed=true]:scale-[0.97]");

/** Smaller press/active scale effect (for menu items) */
export const pressedScaleSmall = cn("active:scale-[0.98] data-[pressed=true]:scale-[0.98]");

/** Hover background change (default) */
export const hoverBgDefault = cn("hover:bg-default data-[hovered=true]:bg-default");

// =============================================================================
// POPUP/OVERLAY ANIMATIONS
// =============================================================================

/** Popup enter animation starting styles */
export const popupEnterStart = cn("data-starting-style:opacity-0 data-starting-style:scale-90");

/** Popup enter animation directional offsets */
export const popupEnterDirectional = cn(
    "data-starting-style:data-[side=top]:translate-y-1 data-starting-style:data-[side=bottom]:-translate-y-1 data-starting-style:data-[side=left]:translate-x-1 data-starting-style:data-[side=right]:-translate-x-1",
);

/** Popup open state */
export const popupOpenState = cn(
    "data-open:opacity-100 data-open:scale-100 data-open:translate-x-0 data-open:translate-y-0 data-open:transition-all data-open:duration-150 data-open:ease-out",
);

/** Popup exit animation */
export const popupExitAnimation = cn(
    "data-ending-style:opacity-0 data-ending-style:scale-95 data-ending-style:transition-all data-ending-style:duration-100 data-ending-style:ease-out",
);

/** Combined popup animation (enter + open + exit) */
export const popupAnimation = cn(
    popupEnterStart,
    popupEnterDirectional,
    popupOpenState,
    popupExitAnimation,
    "motion-reduce:transition-none",
);

// =============================================================================
// COMPONENT-SPECIFIC BASE STYLES
// =============================================================================

/** Overlay/popup container base */
export const overlayBase = cn(
    "origin-(--transform-origin) rounded-2xl bg-overlay p-1 text-sm shadow-overlay will-change-[opacity,transform] outline-none",
);

/** Menu item base layout */
export const menuItemBase = cn(
    "relative flex min-h-9 w-full items-center justify-start gap-2 rounded-xl px-3 py-2 text-sm outline-none",
    noHighlight,
    "select-none cursor-pointer",
);

/** Menu item state styles */
export const menuItemStates = cn(hoverBgDefault, focusRingData, pressedScaleSmall, dataDisabledState, transitionColors);

/** Form field base styles */
export const fieldBase = cn(
    "rounded-field border border-field-border bg-field px-3 py-2 text-base text-field-foreground shadow-field outline-none placeholder:text-field-placeholder w-full sm:text-sm",
);

/** Form field hover state */
export const fieldHover = cn(
    "hover:not-focus:not-focus-visible:bg-field-hover data-[hovered=true]:not-data-[focused=true]:not-data-[focus-visible=true]:bg-field-hover",
);

/** Form field focus state */
export const fieldFocus = cn(
    "focus-visible:bg-field-focus focus-visible:border-field-border-focus data-[focus-visible=true]:bg-field-focus data-[focus-visible=true]:border-field-border-focus",
);

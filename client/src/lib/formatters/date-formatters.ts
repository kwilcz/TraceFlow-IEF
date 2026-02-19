/**
 * Creates a localized date/time formatter with the specified options.
 * Uses the browser's default locale if not specified.
 * @param options - Intl.DateTimeFormat options for formatting
 * @returns A configured Intl.DateTimeFormat instance
 */
export const createDateFormatter = (
    options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }
): Intl.DateTimeFormat => {
    return new Intl.DateTimeFormat(undefined, options);
};

/**
 * Creates a date formatter with medium date and time styles.
 * Suitable for detailed timestamps in logs and viewers.
 * @returns A configured Intl.DateTimeFormat instance
 */
export const createDetailedDateFormatter = (): Intl.DateTimeFormat => {
    return createDateFormatter({
        dateStyle: "medium",
        timeStyle: "medium",
    });
};

/**
 * Formats a Date object using the provided or default formatter.
 * @param date - The Date to format
 * @param formatter - Optional custom formatter (uses default if not provided)
 * @returns Formatted date/time string
 */
export const formatTimestamp = (date: Date, formatter?: Intl.DateTimeFormat): string => {
    const defaultFormatter = formatter ?? createDateFormatter();
    return defaultFormatter.format(date);
};

/**
 * Module-scope singleton for technical date formatting.
 * Uses en-GB locale for dd/MM/YYYY ordering, 24-hour clock.
 */
const technicalDateFormatter = new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
});

/**
 * Formats a Date as `dd-MM-YYYY HH:mm:ss` — a locale-independent
 * technical format suitable for precise timestamps.
 */
export const formatTechnicalDate = (date: Date): string => {
    const parts = technicalDateFormatter.formatToParts(date);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((p) => p.type === type)?.value ?? "";
    return `${get("day")}-${get("month")}-${get("year")} ${get("hour")}:${get("minute")}:${get("second")}`;
};

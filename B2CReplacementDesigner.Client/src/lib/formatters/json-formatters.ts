/**
 * Formats a JSON payload with 2-space indentation.
 * If the payload is a string, attempts to parse and reformat it.
 * Returns the original string if parsing fails.
 * @param payload - The payload to format (can be object, string, or any JSON-serializable value)
 * @returns Formatted JSON string or empty string for null/undefined
 */
export const formatJsonPayload = (payload: unknown): string => {
    if (payload === null || payload === undefined) {
        return "";
    }

    if (typeof payload === "string") {
        try {
            return JSON.stringify(JSON.parse(payload), null, 2);
        } catch {
            return payload;
        }
    }

    return JSON.stringify(payload, null, 2);
};

/**
 * Splits content into an array of lines for code viewer rendering.
 * Returns a placeholder message if content is empty.
 * @param content - The string content to split
 * @returns Array of lines
 */
export const splitIntoLines = (content: string): string[] => {
    return content ? content.split("\n") : ["No payload available."];
};

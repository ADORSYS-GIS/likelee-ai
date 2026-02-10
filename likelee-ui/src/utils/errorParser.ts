/**
 * Parses error messages from the backend and returns a user-friendly message.
 * It handles the "POST URL failed: STATUS BODY" format from base44Client.
 */
export function parseBackendError(error: any): string {
    if (!error) return "An unknown error occurred";

    const originalMessage = error.message || String(error);

    // Check if it matches our client's error format: "METHOD URL failed: STATUS BODY"
    const match = originalMessage.match(/failed: \d+ (.+)$/);
    if (match && match[1]) {
        try {
            const body = JSON.parse(match[1]);

            // Handle our new sanitized error format
            if (body.error) {
                return body.error;
            }

            // Handle raw PostgREST errors (in case some endpoints aren't sanitized yet)
            if (body.message) {
                const msg = body.message;
                const sensitiveKeywords = ["column", "table", "relation", "schema", "cache", "null constraint"];
                if (sensitiveKeywords.some((k: string) => msg.toLowerCase().includes(k))) {
                    return "Invalid data provided. Please check your input.";
                }
                return msg;
            }
        } catch {
            // Not JSON, continue to fallback
        }
    }

    // Generic fallbacks for common status codes if we can't parse the body
    if (originalMessage.includes("failed: 401")) return "Your session has expired. Please log in again.";
    if (originalMessage.includes("failed: 403")) return "You don't have permission to perform this action.";
    if (originalMessage.includes("failed: 404")) return "The requested resource was not found.";
    if (originalMessage.includes("failed: 500")) return "A server error occurred. Please try again later.";

    // If it's too long or looks like raw code, truncate or simplify
    if (originalMessage.length > 100 || originalMessage.includes("{") || originalMessage.includes("[")) {
        return "Something went wrong. Please check your data and try again.";
    }

    return originalMessage;
}

/**
 * Utility functions for handling and displaying user-friendly error messages
 */

interface StructuredError {
    error: string;
    details?: string;
    code?: string;
}

/**
 * Extracts a user-friendly error message from various error formats
 * @param err - The error object (could be Error, string, or structured error)
 * @returns A clean, user-friendly error message
 */
export function getFriendlyErrorMessage(err: any): string {
    // If it's a string, return it directly
    if (typeof err === "string") {
        return err;
    }

    // If it's an Error object with a message
    if (err instanceof Error) {
        const message = err.message;

        // Try to parse the message as JSON (from our structured backend errors)
        try {
            const parsed = JSON.parse(message);
            if (parsed.error) {
                return parsed.details
                    ? `${parsed.error} ${parsed.details}`
                    : parsed.error;
            }
        } catch {
            // Not JSON, check if it's a fetch error with structured content
            const match = message.match(/failed: \d+ (.+)$/);
            if (match) {
                try {
                    const parsed = JSON.parse(match[1]);
                    if (parsed.error) {
                        return parsed.details
                            ? `${parsed.error} ${parsed.details}`
                            : parsed.error;
                    }
                } catch {
                    // Fall through to return the original message
                }
            }

            // Return the original message, but clean it up
            return message.replace(/^(GET|POST|PUT|DELETE) .+ failed: \d+ /, "");
        }
    }

    // If it's already a structured error object
    if (err && typeof err === "object" && err.error) {
        const structured = err as StructuredError;
        return structured.details
            ? `${structured.error} ${structured.details}`
            : structured.error;
    }

    // Fallback to a generic message
    return "An unexpected error occurred. Please try again.";
}

/**
 * Checks if an error is a network/connection error
 */
export function isNetworkError(err: any): boolean {
    if (err instanceof Error) {
        return (
            err.message.includes("fetch") ||
            err.message.includes("network") ||
            err.message.includes("Failed to fetch")
        );
    }
    return false;
}

/**
 * Checks if an error is a validation error (4xx)
 */
export function isValidationError(err: any): boolean {
    if (err instanceof Error) {
        const match = err.message.match(/failed: (\d+)/);
        if (match) {
            const status = parseInt(match[1]);
            return status >= 400 && status < 500;
        }
    }
    return false;
}

/**
 * Parses error messages from the backend and returns a user-friendly message.
 * It handles the "POST URL failed: STATUS BODY" format from base44Client.
 */
export function parseBackendError(error: any): string {
  if (!error) return "An unknown error occurred";

  const originalMessage = error.message || String(error);

  // If we got a structured error object (e.g. from base44Client throwBackendError)
  // prefer that over parsing message strings.
  const structured = (error as any)?.data;
  if (structured) {
    try {
      const body =
        typeof structured === "string" ? JSON.parse(structured) : structured;
      if (body?.status === "error") {
        const err = body?.error;
        if (typeof err === "string") {
          try {
            const parsed = JSON.parse(err);
            return (
              parsed?.error ||
              parsed?.message ||
              parsed?.details ||
              "Something went wrong. Please check your data and try again."
            );
          } catch {
            return err;
          }
        }
        if (typeof err === "object" && err) {
          return (
            (err as any)?.error ||
            (err as any)?.message ||
            (err as any)?.details ||
            "Something went wrong. Please check your data and try again."
          );
        }
      }
    } catch {
      // ignore and fall back to message parsing
    }
  }

  // Check if it matches our client's error format: "METHOD URL failed: STATUS BODY"
  const match = originalMessage.match(/failed: \d+ (.+)$/);
  if (match && match[1]) {
    try {
      const body = JSON.parse(match[1]);

      // Handle our new sanitized error format
      if (body.error) {
        if (typeof body.error === "string") {
          try {
            const parsed = JSON.parse(body.error);
            return (
              parsed?.error ||
              parsed?.message ||
              parsed?.details ||
              "Something went wrong. Please check your data and try again."
            );
          } catch {
            return body.error;
          }
        }
        if (typeof body.error === "object") {
          return (
            (body.error as any)?.error ||
            (body.error as any)?.message ||
            (body.error as any)?.details ||
            "Something went wrong. Please check your data and try again."
          );
        }
        return "Something went wrong. Please check your data and try again.";
      }

      // Handle raw PostgREST errors (in case some endpoints aren't sanitized yet)
      if (body.message) {
        const msg = body.message;
        const sensitiveKeywords = [
          "column",
          "table",
          "relation",
          "schema",
          "cache",
          "null constraint",
        ];
        if (
          sensitiveKeywords.some((k: string) => msg.toLowerCase().includes(k))
        ) {
          return "Invalid data provided. Please check your input.";
        }
        return msg;
      }
    } catch {
      // Not JSON, continue to fallback
    }
  }

  // Generic fallbacks for common status codes if we can't parse the body
  if (originalMessage.includes("failed: 401"))
    return "Your session has expired. Please log in again.";
  if (originalMessage.includes("failed: 403"))
    return "You don't have permission to perform this action.";
  if (originalMessage.includes("failed: 404"))
    return "The requested resource was not found.";
  if (originalMessage.includes("failed: 500"))
    return "A server error occurred. Please try again later.";

  // If it's too long or looks like raw code, truncate or simplify
  if (
    originalMessage.length > 100 ||
    originalMessage.includes("{") ||
    originalMessage.includes("[")
  ) {
    return "Something went wrong. Please check your data and try again.";
  }

  return originalMessage;
}

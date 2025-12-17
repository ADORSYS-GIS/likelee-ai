/**
 * Converts technical error messages into user-friendly messages
 * that are appropriate for displaying in toast notifications.
 *
 * This utility helps avoid showing raw JSON errors, stack traces,
 * or technical jargon to end users.
 */
export function getUserFriendlyError(error: any): string {
  // First, try to extract the actual error message from various formats
  let errorStr = "";

  // Handle error objects with message property
  if (error?.message) {
    errorStr = String(error.message);
  }
  // Handle plain strings
  else if (typeof error === "string") {
    errorStr = error;
  }
  // Handle other error formats
  else {
    errorStr = String(error);
  }

  // Try to parse JSON errors (e.g., storage upload failed: {"statusCode": 404, "error": "Bucket not found"})
  // This handles both inline JSON and JSON after a prefix like "storage upload failed:"
  try {
    // Match JSON in the string (handles "prefix: {...}" format)
    // Use a non-greedy match to handle nested braces
    const jsonMatch = errorStr.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Use the parsed error/message fields if available
      if (parsed.message) {
        errorStr = String(parsed.message);
      } else if (parsed.error) {
        errorStr = String(parsed.error);
      }
    }
  } catch (e) {
    // JSON parsing failed, continue with original string
  }

  // Convert to lowercase for pattern matching
  const errorLower = errorStr.toLowerCase();

  // Email/Auth errors
  if (errorLower.includes("duplicate") && errorLower.includes("email")) {
    return "This email is already registered. Please use a different email or sign in instead.";
  }
  if (errorLower.includes("invalid") && errorLower.includes("email")) {
    return "Please enter a valid email address.";
  }
  if (
    errorLower.includes("weak") ||
    (errorLower.includes("password") && errorLower.includes("invalid"))
  ) {
    return "Please choose a stronger password (at least 8 characters).";
  }
  if (
    errorLower.includes("not authenticated") ||
    errorLower.includes("unauthorized") ||
    errorLower.includes("not signed in")
  ) {
    return "Please sign in to continue.";
  }

  // Upload/Storage errors
  if (
    errorLower.includes("bucket not found") ||
    (errorLower.includes("storage") && errorLower.includes("failed"))
  ) {
    return "Upload failed. Please try again or contact support if the problem persists.";
  }
  if (
    errorLower.includes("file size") ||
    errorLower.includes("too large") ||
    errorLower.includes("exceeds")
  ) {
    return "File is too large. Please use a smaller image (max 20MB).";
  }
  if (
    errorLower.includes("file type") ||
    errorLower.includes("invalid format") ||
    errorLower.includes("unsupported")
  ) {
    return "Invalid file type. Please upload a JPG, PNG, or WebP image.";
  }

  // Network errors
  if (
    errorLower.includes("network") ||
    errorLower.includes("fetch failed") ||
    errorLower.includes("connection")
  ) {
    return "Network error. Please check your connection and try again.";
  }
  if (errorLower.includes("timeout") || errorLower.includes("timed out")) {
    return "Request timed out. Please try again.";
  }

  // Permission errors
  if (
    errorLower.includes("permission") ||
    errorLower.includes("denied") ||
    errorLower.includes("forbidden")
  ) {
    return "Permission denied. Please check your settings and try again.";
  }

  // Server errors
  if (
    errorLower.includes("server error") ||
    errorLower.includes("500") ||
    errorLower.includes("internal error")
  ) {
    return "Server error. Please try again later.";
  }
  if (errorLower.includes("not found") || errorLower.includes("404")) {
    return "Resource not found. Please try again or contact support.";
  }

  // Recording/Voice errors
  if (errorLower.includes("microphone") || errorLower.includes("audio")) {
    return "Unable to access microphone. Please check your browser permissions.";
  }
  if (errorLower.includes("recording") && errorLower.includes("quality")) {
    return "Recording quality is too low. Please try again in a quieter environment.";
  }

  // Generic fallback for "failed" messages
  if (errorLower.includes("failed")) {
    return "Something went wrong. Please try again.";
  }

  // If we have a clean message without technical jargon, use it
  // (short messages without JSON brackets or stack traces)
  if (
    errorStr.length < 100 &&
    !errorStr.includes("{") &&
    !errorStr.includes("[") &&
    !errorStr.includes("at ")
  ) {
    return errorStr;
  }

  // Final fallback
  return "An error occurred. Please try again or contact support if the problem persists.";
}

// Utility to generate unique field names
export const generateFieldName = (prefix: string): string => {
  const timestamp = Date.now().toString(36).substring(4, 7);
  const random = Math.random().toString(36).substring(2, 5);
  return `${prefix}${timestamp}${random}`;
};

/**
 * Convert an arbitrary, user-entered string into a safe "variable style"
 * field name: no spaces, no special characters, and never starting with a
 * digit. Whitespace and separators become camelCase word boundaries so the
 * result stays readable.
 *
 * @example
 *  sanitizeFieldName("First Name")    // "firstName"
 *  sanitizeFieldName("patient age!!") // "patientAge"
 *  sanitizeFieldName("my_field-name") // "myFieldName"
 *  sanitizeFieldName("2nd dose")      // "ndDose"
 */
export const sanitizeFieldName = (raw: string): string => {
  if (!raw) {
    return "";
  }

  const tokens = raw
    .replace(/[^a-zA-Z0-9]+/g, " ") // collapse any non-alphanumeric run into a separator
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) {
    return "";
  }

  const camelCased = tokens
    .map((token, index) =>
      index === 0
        ? token.charAt(0).toLowerCase() + token.slice(1)
        : token.charAt(0).toUpperCase() + token.slice(1),
    )
    .join("");

  // Variable names cannot start with a digit.
  return camelCased.replace(/^[0-9]+/, "");
};
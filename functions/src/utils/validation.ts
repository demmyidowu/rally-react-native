/**
 * Validation utility functions for phone numbers and data validation
 */

/**
 * Validates if a phone number is in E.164 format
 * E.164 format: +[country code][number]
 * Example: +15551234567 (US number)
 *
 * @param phone - Phone number to validate
 * @return true if valid E.164 format, false otherwise
 */
export function isValidE164(phone: string): boolean {
  if (!phone) return false;

  // E.164 format: +[country code][number]
  // Country code: 1-3 digits, Total: max 15 digits
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

/**
 * Formats E.164 phone number for display
 * Converts +15551234567 to (555) 123-4567 for US numbers
 *
 * @param phone - E.164 formatted phone number
 * @return Formatted phone number for display
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone) return "";

  // Handle US numbers specifically
  if (phone.startsWith("+1") && phone.length === 12) {
    const digits = phone.slice(2);
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // For other countries, return as-is
  return phone;
}

/**
 * Validates if a string is a valid Firebase document ID
 *
 * @param id - Document ID to validate
 * @return true if valid, false otherwise
 */
export function isValidDocumentId(id: string): boolean {
  if (!id) return false;

  // Firebase document IDs must be:
  // - At least 1 character long
  // - Not contain forward slashes
  // - Not be exactly "." or ".."
  return id.length > 0 &&
    !id.includes("/") &&
    id !== "." &&
    id !== "..";
}

/**
 * Validates if an email is a university (.edu) email address
 *
 * @param email - Email address to validate
 * @return true if valid .edu email, false otherwise
 */
export function isEduEmail(email: string): boolean {
  if (!email) return false;

  const eduEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.edu$/i;
  return eduEmailRegex.test(email);
}

/**
 * @deprecated Use isEduEmail instead
 */
export const isKSUEmail = isEduEmail;

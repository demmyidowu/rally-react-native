/**
 * PhoneNumberInput Component
 * Phone number input with automatic E.164 formatting (+1XXXXXXXXXX)
 */

import React from 'react';
import { Input, InputProps } from './Input';

export interface PhoneNumberInputProps
  extends Omit<InputProps, 'keyboardType' | 'autoCapitalize'> {
  value: string;
  onChangeText: (formatted: string) => void;
}

export const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  value,
  onChangeText,
  error,
  ...rest
}) => {
  const formatPhoneNumber = (text: string): string => {
    // Remove all non-digit characters
    const digits = text.replace(/\D/g, '');

    // Limit to 11 digits (1 + 10 digits)
    const limited = digits.substring(0, 11);

    // Format based on length
    if (limited.length === 0) return '';
    if (limited.length <= 3) return limited;
    if (limited.length <= 6) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
    if (limited.length <= 10) {
      return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
    }
    // If starts with 1, format as +1 (XXX) XXX-XXXX
    if (limited.startsWith('1')) {
      return `+1 (${limited.slice(1, 4)}) ${limited.slice(4, 7)}-${limited.slice(7, 11)}`;
    }
    // Otherwise format as (XXX) XXX-XXXX and we'll add +1 when sending
    return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6, 10)}`;
  };

  const toE164Format = (text: string): string => {
    // Remove all non-digit characters
    const digits = text.replace(/\D/g, '');

    // If starts with 1 and has 11 digits, it's already formatted
    if (digits.startsWith('1') && digits.length === 11) {
      return `+${digits}`;
    }

    // If has 10 digits, add +1
    if (digits.length === 10) {
      return `+1${digits}`;
    }

    // Return as-is if not valid length
    return text;
  };

  const handleChangeText = (text: string) => {
    formatPhoneNumber(text);  // Keep for side effect visual formatting
    const e164 = toE164Format(text);

    // Store E.164 format internally but display formatted version
    onChangeText(e164);
  };

  const getDisplayValue = (): string => {
    // If value is in E.164 format (+1XXXXXXXXXX), format it for display
    if (value.startsWith('+1') && value.length === 12) {
      const digits = value.substring(2);
      return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
    // If value is already formatted, return it
    if (value.includes('(') || value.includes('-')) {
      return value;
    }
    // Otherwise format the raw digits
    return formatPhoneNumber(value);
  };

  const validatePhoneNumber = (phone: string): string | undefined => {
    if (!phone) return error;

    const digits = phone.replace(/\D/g, '');

    // Check if it's a valid length
    if (digits.length === 10) return undefined; // Valid US phone
    if (digits.startsWith('1') && digits.length === 11) return undefined; // Valid with country code

    if (digits.length > 0 && digits.length < 10) {
      return 'Phone number must be 10 digits';
    }

    return error;
  };

  return (
    <Input
      {...rest}
      value={getDisplayValue()}
      onChangeText={handleChangeText}
      keyboardType="phone-pad"
      autoCapitalize="none"
      error={validatePhoneNumber(value)}
      icon="call"
      placeholder="(555) 123-4567"
    />
  );
};

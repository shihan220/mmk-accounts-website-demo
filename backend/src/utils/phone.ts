const PHONE_REGEX = /^\+[1-9]\d{6,14}$/;

export const normalizePhone = (input: string): string => {
  const trimmed = input.trim();
  let compact = trimmed.replace(/[^\d+]/g, '');

  if (compact.startsWith('00')) {
    compact = `+${compact.slice(2)}`;
  }

  const digitsOnly = compact.replace(/\D/g, '');
  if (!digitsOnly) return '';

  if (compact.startsWith('+')) {
    const withoutLeadingZeros = digitsOnly.replace(/^0+/, '');
    return withoutLeadingZeros ? `+${withoutLeadingZeros}` : '';
  }

  // Accept UK local mobile/landline style inputs such as 07... or 01...
  // by converting the local trunk prefix to +44.
  if (digitsOnly.startsWith('0')) {
    const nationalNumber = digitsOnly.replace(/^0+/, '');
    return nationalNumber ? `+44${nationalNumber}` : '';
  }

  return `+${digitsOnly}`;
};

export const isValidPhone = (phone: string): boolean => PHONE_REGEX.test(phone);

export const normalizeAndValidatePhone = (input: string): string | null => {
  const normalized = normalizePhone(input);
  if (!isValidPhone(normalized)) return null;
  return normalized;
};

export const isEmailLike = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase());
};

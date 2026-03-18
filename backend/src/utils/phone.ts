const PHONE_REGEX = /^\+[1-9]\d{6,14}$/;

export const normalizePhone = (input: string): string => {
  const trimmed = input.trim();
  let compact = trimmed.replace(/[^\d+]/g, '');

  if (compact.startsWith('00')) {
    compact = `+${compact.slice(2)}`;
  }

  const digitsOnly = compact.replace(/\D/g, '');
  if (!digitsOnly) return '';

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

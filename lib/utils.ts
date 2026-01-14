import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type PasswordValidation = {
  minLength: boolean;
  maxLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
};

export function validatePassword(password: string): PasswordValidation {
  return {
    minLength: password.length >= 8,
    maxLength: password.length <= 100,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[^A-Za-z0-9]/.test(password),
  };
}

export function isPasswordValid(validation: PasswordValidation): boolean {
  return (
    validation.minLength &&
    validation.maxLength &&
    validation.hasUppercase &&
    validation.hasLowercase &&
    validation.hasNumber &&
    validation.hasSpecialChar
  );
}

/**
 * Formats product names for display by replacing dashes with spaces.
 * Also handles comma-separated names (takes first part) and normalizes whitespace.
 * Example: "Amuseables-Arlette-Heart-Macaron-(Red)" -> "Amuseables Arlette Heart Macaron (Red)"
 */
export function formatProductName(rawName: string): string {
  const cleanedName = rawName
    .trim()
    .split(",")
    .at(0)
    ?.replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleanedName ?? rawName;
}

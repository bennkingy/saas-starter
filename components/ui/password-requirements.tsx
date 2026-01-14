'use client';

import { Check, X } from 'lucide-react';
import type { PasswordValidation } from '@/lib/utils';

type PasswordRequirementsProps = {
  validation: PasswordValidation;
  className?: string;
};

export function PasswordRequirements({
  validation,
  className = '',
}: PasswordRequirementsProps) {
  const requirements = [
    {
      key: 'minLength' as const,
      label: 'At least 8 characters',
      met: validation.minLength,
    },
    {
      key: 'maxLength' as const,
      label: 'No more than 100 characters',
      met: validation.maxLength,
    },
    {
      key: 'hasUppercase' as const,
      label: 'At least one uppercase letter',
      met: validation.hasUppercase,
    },
    {
      key: 'hasLowercase' as const,
      label: 'At least one lowercase letter',
      met: validation.hasLowercase,
    },
    {
      key: 'hasNumber' as const,
      label: 'At least one number',
      met: validation.hasNumber,
    },
    {
      key: 'hasSpecialChar' as const,
      label: 'At least one special character',
      met: validation.hasSpecialChar,
    },
  ];

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-sm font-medium text-gray-700 mb-2">
        Password requirements:
      </p>
      <ul className="space-y-1.5">
        {requirements.map((req) => (
          <li
            key={req.key}
            className="flex items-center gap-2 text-sm"
          >
            {req.met ? (
              <Check className="h-4 w-4 text-green-600 shrink-0" />
            ) : (
              <X className="h-4 w-4 text-gray-400 shrink-0" />
            )}
            <span
              className={req.met ? 'text-green-700' : 'text-gray-600'}
            >
              {req.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

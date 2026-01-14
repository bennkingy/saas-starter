'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { resetPassword } from '../actions';
import { ActionState } from '@/lib/auth/middleware';
import { SiteLogo } from '@/components/site/site-logo';
import { validatePassword, isPasswordValid } from '@/lib/utils';
import { PasswordRequirements } from '@/components/ui/password-requirements';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    resetPassword,
    { error: '' }
  );
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRequirements, setShowRequirements] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  
  const passwordValidation = validatePassword(password);
  const passwordsMatch = password === confirmPassword;
  const isFormValid = isPasswordValid(passwordValidation) && passwordsMatch;

  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        router.push('/sign-in');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state?.success, router]);

  if (!token) {
    return (
      <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <SiteLogo variant="header" href="/" showText={false} />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Invalid reset link
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            This password reset link is invalid or missing.
          </p>
          <div className="mt-6 text-center">
            <Link
              href="/forgot-password"
              className="text-sm text-primary hover:text-primary/80"
            >
              Request a new reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <SiteLogo variant="header" href="/" showText={false} />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Set new password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your new password below.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <form
          ref={formRef}
          className="space-y-6"
          action={formAction}
          onSubmit={(e) => {
            if (!isFormValid) {
              e.preventDefault();
              setShowRequirements(true);
            }
          }}
        >
          <input type="hidden" name="token" value={token} />
          
          <div>
            <Label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              New Password
            </Label>
            <div className="mt-1">
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setShowRequirements(true);
                }}
                onFocus={() => setShowRequirements(true)}
                required
                minLength={8}
                maxLength={100}
                className="appearance-none rounded-full relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Enter your new password"
              />
            </div>
            {showRequirements && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <PasswordRequirements validation={passwordValidation} />
              </div>
            )}
          </div>

          <div>
            <Label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700"
            >
              Confirm Password
            </Label>
            <div className="mt-1">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setShowRequirements(true);
                }}
                onFocus={() => setShowRequirements(true)}
                required
                minLength={8}
                maxLength={100}
                className={`appearance-none rounded-full relative block w-full px-3 py-2 border ${
                  confirmPassword && !passwordsMatch
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-primary focus:border-primary'
                } placeholder-gray-500 text-gray-900 focus:outline-none focus:z-10 sm:text-sm`}
                placeholder="Confirm your new password"
              />
            </div>
            {confirmPassword && !passwordsMatch && (
              <p className="mt-1 text-sm text-red-600">
                Passwords do not match
              </p>
            )}
            {confirmPassword && passwordsMatch && (
              <p className="mt-1 text-sm text-green-600">
                Passwords match
              </p>
            )}
          </div>

          {state?.error && (
            <div className="text-red-500 text-sm">{state.error}</div>
          )}

          {state?.success && (
            <div className="text-green-600 text-sm">{state.success}</div>
          )}

          <div>
            <Button
              type="submit"
              className="w-full flex justify-center items-center rounded-full"
              disabled={pending || !isFormValid}
            >
              {pending ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Resetting...
                </>
              ) : (
                'Reset password'
              )}
            </Button>
          </div>
        </form>

        <div className="mt-6">
          <div className="text-center">
            <Link
              href="/sign-in"
              className="text-sm text-primary hover:text-primary/80"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useActionState, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, Trash2 } from 'lucide-react';
import { updateAccount, updatePassword, deleteAccount } from '@/app/(login)/actions';
import { User, NotificationPreferences } from '@/lib/db/schema';
import useSWR from 'swr';
import { Suspense } from 'react';
import { validatePassword, isPasswordValid } from '@/lib/utils';
import { PasswordRequirements } from '@/components/ui/password-requirements';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type ActionState = {
  name?: string;
  error?: string;
  success?: string;
};

type PasswordState = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  error?: string;
  success?: string;
};

type DeleteState = {
  password?: string;
  error?: string;
  success?: string;
};

type AccountFormProps = {
  state: ActionState;
  nameValue?: string;
  emailValue?: string;
  phoneNumberValue?: string | null;
};

function AccountForm({
  state,
  nameValue = '',
  emailValue = '',
  phoneNumberValue = ''
}: AccountFormProps) {
  return (
    <>
      <div>
        <Label htmlFor="name" className="mb-2">
          Name
        </Label>
        <Input
          id="name"
          name="name"
          placeholder="Enter your name"
          defaultValue={state.name || nameValue}
          required
        />
      </div>
      <div>
        <Label htmlFor="email" className="mb-2">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Enter your email"
          defaultValue={emailValue}
          required
        />
      </div>
      <div>
        <Label htmlFor="phoneNumber" className="mb-2">
          Phone Number
        </Label>
        <Input
          id="phoneNumber"
          name="phoneNumber"
          type="tel"
          placeholder="+15551234567"
          defaultValue={phoneNumberValue || ''}
        />
        <p className="text-xs text-gray-600 mt-2">
          Enter your phone number in E.164 format (e.g., +15551234567)
        </p>
      </div>
    </>
  );
}

function AccountFormWithData({ state }: { state: ActionState }) {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const { data: prefs } = useSWR<NotificationPreferences>(
    '/api/notification-preferences',
    fetcher
  );
  return (
    <AccountForm
      state={state}
      nameValue={user?.name ?? ''}
      emailValue={user?.email ?? ''}
      phoneNumberValue={prefs?.phoneNumber ?? ''}
    />
  );
}

function PasswordUpdateForm({
  passwordState,
  passwordAction,
  isPasswordPending,
}: {
  passwordState: PasswordState;
  passwordAction: (formData: FormData) => void;
  isPasswordPending: boolean;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRequirements, setShowRequirements] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const passwordValidation = validatePassword(newPassword);
  const passwordsMatch = newPassword === confirmPassword;
  const isFormValid =
    currentPassword.length > 0 &&
    isPasswordValid(passwordValidation) &&
    passwordsMatch &&
    currentPassword !== newPassword;

  return (
    <form
      ref={formRef}
      className="space-y-4"
      action={passwordAction}
      onSubmit={(e) => {
        if (!isFormValid) {
          e.preventDefault();
          setShowRequirements(true);
        }
      }}
    >
      <div>
        <Label htmlFor="current-password" className="mb-2">
          Current Password
        </Label>
        <Input
          id="current-password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          minLength={8}
          maxLength={100}
        />
      </div>
      <div>
        <Label htmlFor="new-password" className="mb-2">
          New Password
        </Label>
        <Input
          id="new-password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            setShowRequirements(true);
          }}
          onFocus={() => setShowRequirements(true)}
          required
          minLength={8}
          maxLength={100}
        />
        {showRequirements && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <PasswordRequirements validation={passwordValidation} />
          </div>
        )}
      </div>
      <div>
        <Label htmlFor="confirm-password" className="mb-2">
          Confirm New Password
        </Label>
        <Input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setShowRequirements(true);
          }}
          onFocus={() => setShowRequirements(true)}
          required
          minLength={8}
          maxLength={100}
          className={
            confirmPassword && !passwordsMatch
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : ''
          }
        />
        {confirmPassword && !passwordsMatch && (
          <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
        )}
        {confirmPassword && passwordsMatch && (
          <p className="mt-1 text-sm text-green-600">Passwords match</p>
        )}
        {currentPassword && newPassword && currentPassword === newPassword && (
          <p className="mt-1 text-sm text-red-600">
            New password must be different from current password
          </p>
        )}
      </div>
      {passwordState.error ? (
        <p className="text-red-500 text-sm">{passwordState.error}</p>
      ) : null}
      {passwordState.success ? (
        <p className="text-green-500 text-sm">{passwordState.success}</p>
      ) : null}
      <Button
        type="submit"
        className="bg-primary hover:bg-primary/90 text-primary-foreground"
        disabled={isPasswordPending || !isFormValid}
      >
        {isPasswordPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Updating...
          </>
        ) : (
          <>
            <Lock className="mr-2 h-4 w-4" />
            Update Password
          </>
        )}
      </Button>
    </form>
  );
}

export default function GeneralPage() {
  const [accountState, accountAction, isAccountPending] = useActionState<
    ActionState,
    FormData
  >(
    updateAccount,
    {}
  );

  const [passwordState, passwordAction, isPasswordPending] = useActionState<
    PasswordState,
    FormData
  >(updatePassword, {});

  const [deleteState, deleteAction, isDeletePending] = useActionState<
    DeleteState,
    FormData
  >(deleteAccount, {});

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        General Settings
      </h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" action={accountAction}>
            <Suspense fallback={<AccountForm state={accountState} />}>
              <AccountFormWithData state={accountState} />
            </Suspense>
            {accountState.error && (
              <p className="text-red-500 text-sm">{accountState.error}</p>
            )}
            {accountState.success && (
              <p className="text-green-500 text-sm">{accountState.success}</p>
            )}
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={isAccountPending}
            >
              {isAccountPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent>
          <PasswordUpdateForm
            passwordState={passwordState}
            passwordAction={passwordAction}
            isPasswordPending={isPasswordPending}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delete Account</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Account deletion is non-reversable. Please proceed with caution.
          </p>
          <form action={deleteAction} className="space-y-4">
            <div>
              <Label htmlFor="delete-password" className="mb-2">
                Confirm Password
              </Label>
              <Input
                id="delete-password"
                name="password"
                type="password"
                required
                minLength={8}
                maxLength={100}
                defaultValue={deleteState.password}
              />
            </div>
            {deleteState.error ? (
              <p className="text-red-500 text-sm">{deleteState.error}</p>
            ) : null}
            {deleteState.success ? (
              <p className="text-green-500 text-sm">{deleteState.success}</p>
            ) : null}
            <Button
              type="submit"
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeletePending}
            >
              {isDeletePending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, readError } from '../api/client.js';
import { Field } from '../components/Field.jsx';
import { Button } from '../components/Button.jsx';

function rules(pw) {
  return [
    { ok: pw.length >= 10, text: 'At least 10 characters' },
    { ok: /[A-Za-z]/.test(pw) && /\d/.test(pw), text: 'At least one letter and one number' },
  ];
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [form, setForm] = useState({ newPassword: '', confirm: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  const mismatch = form.confirm && form.confirm !== form.newPassword;

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;

    if (!token) {
      setError({ message: 'Missing reset token. Please request a new link.', fields: {} });
      return;
    }

    if (form.newPassword !== form.confirm) {
      setError({ message: '', fields: { confirm: 'The two passwords do not match.' } });
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword: form.newPassword,
      });
      setSuccess(true);
    } catch (err) {
      setError(readError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <img src="/natural-remedies-logo.png" alt="Natural Remedies Logo" className="h-10 w-auto object-contain" />
          <div className="leading-tight">
            <p className="font-semibold text-base text-ink">Complaint Management</p>
            <p className="text-sm text-ink-muted">Set New Password</p>
          </div>
        </div>

        <div className="panel p-6">
          {!token ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bad-soft text-bad">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-ink">Invalid Reset Link</h2>
              <p className="text-sm text-ink-muted">
                This password reset link is invalid or incomplete. Please request a new link.
              </p>
              <div className="pt-2">
                <Link to="/forgot-password">
                  <Button variant="primary" className="w-full">
                    Request new link
                  </Button>
                </Link>
              </div>
            </div>
          ) : success ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-ink">Password Reset Complete</h2>
              <p className="text-sm text-ink-muted">
                Your password has been changed successfully. You can now sign in with your new password.
              </p>
              <div className="pt-2">
                <Link to="/login">
                  <Button variant="primary" className="w-full">
                    Sign in now
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4" noValidate>
              <div>
                <h1 className="text-lg font-semibold text-ink">Choose a new password</h1>
                <p className="mt-1 text-sm text-ink-muted">
                  Create a new password for your account.
                </p>
              </div>

              {error?.message && !Object.keys(error.fields || {}).length && (
                <div className="rounded border border-bad/20 bg-bad-soft px-3 py-2 text-sm text-bad" role="alert">
                  <p>{error.message}</p>
                  {error.message.includes('expired') || error.message.includes('invalid') ? (
                    <Link to="/forgot-password" className="mt-2 inline-block font-semibold underline">
                      Request a new reset link →
                    </Link>
                  ) : null}
                </div>
              )}

              <Field label="New password" error={error?.fields?.newPassword}>
                {(p) => (
                  <input
                    {...p}
                    type="password"
                    autoComplete="new-password"
                    autoFocus
                    className="field-input"
                    value={form.newPassword}
                    onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  />
                )}
              </Field>

              <ul className="space-y-0.5 text-xs">
                {rules(form.newPassword).map((r) => (
                  <li key={r.text} className={r.ok ? 'text-ok font-medium' : 'text-ink-muted'}>
                    {r.ok ? '✓' : '·'} {r.text}
                  </li>
                ))}
              </ul>

              <Field
                label="Confirm new password"
                error={error?.fields?.confirm || (mismatch ? 'The two passwords do not match.' : null)}
              >
                {(p) => (
                  <input
                    {...p}
                    type="password"
                    autoComplete="new-password"
                    className="field-input"
                    value={form.confirm}
                    onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  />
                )}
              </Field>

              <Button type="submit" variant="primary" loading={busy} className="w-full">
                Reset password
              </Button>

              <div className="pt-1 text-center">
                <Link to="/login" className="text-sm text-ink-muted hover:text-ink hover:underline">
                  ← Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}


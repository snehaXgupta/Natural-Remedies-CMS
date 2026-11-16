import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, readError } from '../api/client.js';
import { Field } from '../components/Field.jsx';
import { Button } from '../components/Button.jsx';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;

    const trimmed = email.trim();
    if (!trimmed) {
      setError({ message: 'Please enter your email address.', fields: { email: 'Email is required.' } });
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await api.post('/auth/forgot-password', { email: trimmed });
      setSent(true);
    } catch (err) {
      setError(readError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex flex-col justify-between px-4 py-8 bg-[#f5f9fd] bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/login-bg.jpg')" }}
    >
      <div />
      <div className="relative z-10 w-full max-w-[420px] mx-auto my-auto">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-sky-100 shadow-[0_12px_40px_rgba(15,23,42,0.08)] p-7 sm:p-8">
          <div className="flex items-center justify-between mb-5">
            <img src="/vetaura-logo.png" alt="VetAura Logo" className="h-10 w-auto object-contain" />
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200/60">
              Complaint Management
            </span>
          </div>

          {sent ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-ink">Check your email</h2>
              <p className="text-sm text-ink-muted">
                If an account exists for <strong className="text-ink">{email}</strong>, we have sent instructions to reset your password.
              </p>
              <p className="text-xs text-ink-muted">
                The link will expire in 30 minutes. If you do not see the email, please check your spam folder.
              </p>
              <div className="pt-2">
                <Link to="/login">
                  <Button variant="primary" className="w-full">
                    Back to sign in
                  </Button>
                </Link>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="text-xs text-brand hover:underline"
                >
                  Didn't receive an email? Try again
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4" noValidate>
              <div>
                <h1 className="text-lg font-semibold text-ink">Forgot password?</h1>
                <p className="mt-1 text-sm text-ink-muted">
                  Enter your registered work email and we will send you a link to reset your password.
                </p>
              </div>

              {error && (
                <p className="rounded border border-bad/20 bg-bad-soft px-3 py-2 text-sm text-bad" role="alert">
                  {error.message}
                </p>
              )}

              <Field label="Work Email" error={error?.fields?.email}>
                {(p) => (
                  <input
                    {...p}
                    name="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="e.g. employee@naturalremedy.com"
                    className="field-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                )}
              </Field>

              <Button type="submit" variant="primary" loading={busy} className="w-full">
                Send reset link
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
      <footer className="relative z-10 w-full text-left py-4 text-xs text-slate-500">
        Copyright © 2027 VetAura. All rights reserved.
      </footer>
    </div>
  );
}


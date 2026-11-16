import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { readError } from '../api/client.js';
import { Field } from '../components/Field.jsx';
import { Button } from '../components/Button.jsx';

export function LoginPage() {
  const { login, notice } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;

    // Read state or fallback to direct input element values (fixes browser autofill desync)
    const formEl = e.currentTarget;
    const emailVal = (form.email || formEl.elements.email?.value || '').trim();
    const passVal = form.password || formEl.elements.password?.value || '';

    if (!emailVal || !passVal) {
      setError({ message: 'Please enter your email and password.', fields: {} });
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await login(emailVal, passVal);
    } catch (err) {
      setError(readError(err));
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between px-4 py-8 overflow-hidden bg-gradient-to-br from-sky-50/50 via-white to-blue-50/40">
      {/* Pure Sky / Ice Blue Ambient Glow (Zero Green) */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-sky-200/30 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-32 h-[500px] w-[500px] rounded-full bg-blue-100/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-1/4 h-[420px] w-[420px] rounded-full bg-sky-100/40 blur-3xl" />

      <div />
      <div className="relative z-10 w-full max-w-sm mx-auto my-auto">
        <div className="mb-6 flex items-center gap-3">
          <img src="/vetaura-logo.png" alt="VetAura Logo" className="h-11 w-auto object-contain" />
          <div className="leading-tight">
            <p className="font-semibold text-base text-ink">Complaint Management</p>
            <p className="text-sm text-ink-muted">Sign in with your company account only</p>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-lg border border-slate-200/90 bg-white p-6 shadow-sm space-y-4" noValidate>
          {notice && !error && <p className="rounded border border-warn/20 bg-warn-soft px-3 py-2 text-sm text-warn">{notice}</p>}
          {error && !Object.keys(error.fields).length && (
            <p className="rounded border border-bad/20 bg-bad-soft px-3 py-2 text-sm text-bad" role="alert">{error.message}</p>
          )}
          <Field label="Email" error={error?.fields.email}>
            {(p) => (
              <input
                {...p}
                name="email"
                type="email"
                autoComplete="username"
                autoFocus
                className="field-input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            )}
          </Field>
          <Field label="Password" error={error?.fields.password}>
            {(p) => (
              <input
                {...p}
                name="password"
                type="password"
                autoComplete="current-password"
                className="field-input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            )}
          </Field>
          <Button type="submit" variant="primary" loading={busy} className="w-full">
            Sign in
          </Button>
        </form>
        <div className="mt-4 text-center">
          <Link to="/forgot-password" className="text-sm font-medium text-brand hover:underline">
            Forgot your password?
          </Link>
        </div>
      </div>
      <footer className="relative z-10 w-full text-left py-4 text-xs text-slate-500">
        Copyright © 2027 VetAura. All rights reserved.
      </footer>
    </div>
  );
}

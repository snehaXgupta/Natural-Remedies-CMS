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
    <div className="flex min-h-screen flex-col justify-between px-4 py-8">
      <div />
      <div className="w-full max-w-sm mx-auto my-auto">
        <div className="mb-6 flex items-center gap-3">
          <img src="/vetaura-logo.png" alt="VetAura Logo" className="h-11 w-auto object-contain" />
          <div className="leading-tight">
            <p className="font-semibold text-base text-ink">Complaint Management</p>
            <p className="text-sm text-ink-muted">Sign in with your company account only</p>
          </div>
        </div>

        <form onSubmit={submit} className="panel space-y-4 p-6" noValidate>
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
      <footer className="w-full text-left py-4 text-xs text-slate-500">
        Copyright © 2027 Vetaura. All rights reserved.
      </footer>
    </div>
  );
}

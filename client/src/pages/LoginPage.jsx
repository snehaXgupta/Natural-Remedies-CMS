import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { readError } from '../api/client.js';

export function LoginPage() {
  const { login, notice } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
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
    <div
      className="relative min-h-screen flex flex-col justify-between px-4 py-8 bg-[#f5f9fd] bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/login-bg.jpg')" }}
    >
      <div />

      <div className="relative z-10 w-full max-w-[420px] mx-auto my-auto">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-sky-100 shadow-[0_12px_40px_rgba(15,23,42,0.08)] p-7 sm:p-8">
          {/* Header inside card */}
          <div className="flex items-center justify-between mb-5">
            <img src="/vetaura-logo.png" alt="VetAura Logo" className="h-10 w-auto object-contain" />
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200/60">
              Complaint Management System
            </span>
          </div>

          {/* Title */}
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-5">
            Sign in to access your portal
          </h1>

          <form onSubmit={submit} className="space-y-4" noValidate>
            {notice && !error && (
              <p className="rounded-lg border border-warn/20 bg-warn-soft px-3 py-2 text-sm text-warn">{notice}</p>
            )}
            {error && !Object.keys(error.fields).length && (
              <p className="rounded-lg border border-bad/20 bg-bad-soft px-3 py-2 text-sm text-bad" role="alert">{error.message}</p>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Work Email
              </label>
              <input
                name="email"
                type="email"
                autoComplete="username"
                autoFocus
                placeholder="name@vetaura.com"
                className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition ${
                  error?.fields.email ? 'border-bad ring-1 ring-bad' : 'border-slate-200'
                }`}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              {error?.fields.email && (
                <p className="mt-1 text-xs text-bad">{error.fields.email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition pr-10 ${
                    error?.fields.password ? 'border-bad ring-1 ring-bad' : 'border-slate-200'
                  }`}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {error?.fields.password && (
                <p className="mt-1 text-xs text-bad">{error.fields.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 px-4 rounded-lg bg-[#0066cc] hover:bg-[#0052a3] active:bg-[#004080] text-white font-medium text-sm transition shadow-sm flex items-center justify-center gap-2 mt-2"
            >
              {busy ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/forgot-password" className="text-xs font-medium text-[#0066cc] hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>
      </div>

      <footer className="relative z-10 w-full text-left py-4 text-xs text-slate-500">
        Copyright © 2027 VetAura. All rights reserved.
      </footer>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { readError } from '../api/client.js';

/* Official VetAura Logo */
function VetAuraLogo({ className = 'h-8 sm:h-9 w-auto' }) {
  return (
    <img
      src="/vetaura-logo.png"
      alt="VetAura Logo"
      className={`${className} object-contain`}
    />
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const { login, notice } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;

    // Read state or fallback to input element values (fixes autofill desync)
    const formEl = e.currentTarget;
    const emailVal = (form.email || formEl.elements.email?.value || '').trim();
    const passVal = form.password || formEl.elements.password?.value || '';

    if (!emailVal || !emailVal.includes('@')) {
      setError({ message: 'Please enter a valid email address (e.g., name@vetaura.com).', fields: { email: 'Valid email required' } });
      return;
    }

    if (!passVal) {
      setError({ message: 'Please enter your portal password.', fields: { password: 'Password required' } });
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await login(emailVal, passVal);
      navigate('/', { replace: true });
    } catch (err) {
      setError(readError(err));
      setBusy(false);
    }
  };

  return (
    <main className="relative w-full min-h-screen md:h-screen grid grid-cols-1 md:grid-cols-2 text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      {/* LEFT SIDE (50% Width): Visual Showcase Panel */}
      <section className="relative w-full h-full flex flex-col justify-between bg-gradient-to-br from-[#EDF5FF] via-[#E4F0FF] to-[#D9EAFF] px-6 py-8 md:px-10 lg:px-14 overflow-hidden border-b md:border-b-0 md:border-r border-blue-200/70">
        {/* Ambient Translucent Orbs */}
        <div aria-hidden="true" className="bg-orb-top pointer-events-none absolute -top-24 -left-24 w-[320px] h-[320px] sm:w-[440px] sm:h-[440px] rounded-full opacity-80" />
        <div aria-hidden="true" className="bg-orb-bottom pointer-events-none absolute -bottom-28 -right-20 w-[340px] h-[340px] sm:w-[460px] sm:h-[460px] rounded-full opacity-85" />

        {/* Top-Left Company Logo on Left Panel */}
        <div className="relative z-10 w-full flex items-center justify-start">
          <div className="inline-flex items-center shrink-0">
            <VetAuraLogo className="h-8 sm:h-9 w-auto" />
          </div>
        </div>

        {/* Large Crisp Flat Vector Illustration */}
        <div className="relative z-10 w-full max-w-[420px] lg:max-w-[480px] mx-auto my-auto animate-float-slow py-4">
          <svg viewBox="0 0 520 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto drop-shadow-sm" role="img" aria-label="Analyst reviewing complaint analytics">
            {/* Background Blob Shapes */}
            <path d="M98.5 76.5C156.5 34.5 235.5 52.5 294.5 42.5C353.5 32.5 432.5 41.5 466.5 104.5C500.5 167.5 494.5 256.5 445.5 304.5C396.5 352.5 314.5 346.5 244.5 349.5C174.5 352.5 92.5 356.5 55.5 296.5C18.5 236.5 40.5 118.5 98.5 76.5Z" fill="#CFE4FC" fillOpacity="0.72" />
            <path d="M126 95C184 62 252 75 308 65C364 55 426 68 452 124C478 180 468 252 424 292C380 332 308 328 244 330C180 332 108 334 78 282C48 230 68 128 126 95Z" fill="#DCEEFF" fillOpacity="0.9" />

            {/* Desk Structure */}
            <rect x="148" y="192" width="8" height="175" rx="2" fill="#1D56C6" />
            <rect x="404" y="192" width="8" height="175" rx="2" fill="#4685F2" />
            <rect x="248" y="192" width="8" height="175" rx="2" fill="#1D56C6" />
            <rect x="296" y="192" width="8" height="175" rx="2" fill="#4685F2" />
            <rect x="142" y="182" width="156" height="26" fill="#184EB8" />
            <rect x="298" y="182" width="122" height="26" fill="#5D98F8" />
            <rect x="134" y="175" width="164" height="8" rx="3" fill="#2563EB" />
            <rect x="298" y="175" width="132" height="8" rx="3" fill="#60A5FA" />

            {/* Plants */}
            <path d="M342 152H356L354 175H344L342 152Z" fill="#1E40AF" />
            <path d="M349 152C349 152 339 135 342 121C344 111 353 111 355 121C358 135 349 152 349 152Z" fill="#48A88E" />
            <path d="M351 152C351 152 361 139 359 128C357 120 350 121 348 129C346 138 351 152 351 152Z" fill="#3B8E77" />
            <path d="M327 158H341L339.5 175H328.5L327 158Z" fill="#60A5FA" />
            <path d="M334 158C331 150 326 146 325 142C328 144 332 149 334 156Z" fill="#5CC6A9" />
            <path d="M334 158C334 148 333 142 334 138C336 142 336 149 335 158Z" fill="#48A88E" />
            <path d="M335 158C338 150 342 146 344 143C342 147 338 152 336 158Z" fill="#5CC6A9" />

            {/* Monitor */}
            <path d="M294 156H306L310 171H290L294 156Z" fill="#3B82F6" />
            <rect x="282" y="170" width="36" height="5" rx="2" fill="#1D4ED8" />
            <path d="M324 76L331 78V160L324 162V76Z" fill="#1D4ED8" />
            <path d="M248 92C248 88.6863 250.562 85.9369 253.867 85.6948L320.867 76.7948C324.487 76.5295 327.5 79.3935 327.5 83.0228V156.977C327.5 160.606 324.487 163.47 320.867 162.905L253.867 158.305C250.562 158.063 248 155.314 248 152V92Z" fill="#5B9BF8" />
            <path d="M253 95C253 92.7909 254.712 90.9585 256.915 90.8027L318.915 83.4027C321.314 83.2331 323.3 85.1332 323.3 87.5382V150.462C323.3 152.867 321.314 154.767 318.915 154.597L256.915 151.197C254.712 151.041 253 149.209 253 147V95Z" fill="#F8FAFC" />

            {/* Dashboard UI Inside Monitor */}
            <circle cx="271" cy="109" r="11" fill="#2563EB" />
            <path d="M271 109L271 98A11 11 0 0 1 282 109Z" fill="#93C5FD" />
            <path d="M271 109L282 109A11 11 0 0 1 275 119Z" fill="#60A5FA" />
            <circle cx="271" cy="109" r="5" fill="#F8FAFC" />
            <rect x="288" y="96" width="29" height="3.5" rx="1.75" fill="#1D4ED8" />
            <rect x="288" y="103" width="22" height="3" rx="1.5" fill="#60A5FA" />
            <rect x="288" y="109" width="26" height="3" rx="1.5" fill="#93C5FD" />
            <rect x="260" y="128" width="25" height="3.5" rx="1.75" fill="#3B82F6" />
            <rect x="260" y="135" width="18" height="3" rx="1.5" fill="#93C5FD" />
            <circle cx="304" cy="133" r="12" fill="#60A5FA" />
            <path d="M304 133L304 119A13 13 0 0 1 317 132Z" fill="#1D4ED8" />

            {/* Floating Profile Window Card */}
            <g className="animate-float-delayed">
              <rect x="213" y="104" width="42" height="36" rx="4" fill="#60A5FA" />
              <rect x="215" y="106" width="38" height="31" rx="3" fill="#FFFFFF" />
              <rect x="218" y="110" width="16" height="23" rx="2" fill="#E0EEFF" />
              <circle cx="226" cy="117" r="4.2" fill="#1D4ED8" />
              <path d="M219.5 131C219.5 126.5 222.4 124 226 124C229.6 124 232.5 126.5 232.5 131V133H219.5V131Z" fill="#1D4ED8" />
              <rect x="237" y="112" width="13" height="2.8" rx="1.4" fill="#2563EB" />
              <rect x="237" y="118" width="10" height="2.4" rx="1.2" fill="#93C5FD" />
              <rect x="237" y="123" width="12" height="2.4" rx="1.2" fill="#93C5FD" />
            </g>

            {/* Floating Green Checkmark Badge */}
            <g className="animate-pulse-soft">
              <circle cx="321" cy="76" r="13.5" fill="#47A88C" />
              <circle cx="321" cy="76" r="11" fill="#57B8A0" />
              <path d="M316 76.2L319.5 79.7L326.5 72.5" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            </g>

            <rect x="242" y="172" width="32" height="3" rx="1.5" fill="#93C5FD" />

            {/* Character */}
            <path d="M168 232L224 268L192 332L172 322L194 274L142 246L168 232Z" fill="#0A2E73" />
            <path d="M172 322L191 331L183 356C182 359 178 360 175 358L165 344L172 322Z" fill="#0A2E73" />
            <path d="M150 225L242 256C250 259 253 268 249 276L212 342L186 330L215 276L134 252L150 225Z" fill="#0F3582" />
            <path d="M187 331L210 342L204 356L222 361C225 362 226 367 222 367H195C191 367 188 364 187 360L183 341L187 331Z" fill="#0F3582" />

            {/* Office Chair */}
            <path d="M110 258L96 367" stroke="#0B3B8C" strokeWidth="4" strokeLinecap="round" />
            <path d="M144 258L138 367" stroke="#0B3B8C" strokeWidth="4" strokeLinecap="round" />
            <path d="M188 258L182 367" stroke="#0A2E73" strokeWidth="4" strokeLinecap="round" />
            <path d="M220 258L234 367" stroke="#0B3B8C" strokeWidth="4" strokeLinecap="round" />
            <path d="M106 254H218C221 254 223 257 222 259H108C106 259 105 256 106 254Z" fill="#0B3B8C" />
            <path d="M84 162C84 159 86.5 157 89.5 157H124C127 157 129.5 159.2 130 162.2L142 255H108L84 162Z" fill="#0B3B8C" />
            <path d="M84 159H125" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />

            {/* Torso & Head */}
            <path d="M122 103L156 116L176 238C176 248 168 256 158 256H132L118 162C115 140 112 118 122 103Z" fill="#4A90E2" />
            <path d="M122 97L158 113L155 120L118 104L122 97Z" fill="#2563EB" />
            <path d="M128 84H158L164 102C164 108 159 112 153 112H145L142 116L124 102L128 84Z" fill="#DCEBFE" />
            <path d="M144 74H168V83C168 85.5 166 87 163.5 87H159.5C157 87 155 85.5 155 83V77" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M121 71C120 60 128 52 140 52H157C162 52 164 56 161 61L156 66V75L151 75C148 75 146 77 146 80C146 83 148 85 151 85V93C144 97 136 98 128 98L121 71Z" fill="#0F172A" />
            <path d="M155 82H159V93C159 93 165 93 168 91V101C168 106 163 110 158 110C155 110 154 107 154 104V82H155Z" fill="#0F172A" />

            {/* Arms */}
            <path d="M135 115C148 114 162 124 176 138L206 156L198 173L158 156C142 148 131 132 135 115Z" fill="#5D9DF8" />
            <path d="M204 152L218 158L210 177L195 171L204 152Z" fill="#1D56C6" />
            <path d="M214 161L264 168C268 168.5 271 171 271 174H246L210 171L214 161Z" fill="#E8F2FF" />
          </svg>
        </div>

        {/* Bottom Footer on Left Panel */}
        <footer className="relative z-10 mt-4 md:mt-0 pt-2 text-center">
          <p className="text-xs sm:text-[13px] text-[#475569] font-normal">
            Copyright &copy; 2027 VetAura. All rights reserved.
          </p>
        </footer>
      </section>

      {/* RIGHT SIDE (50% Width): Login Form Panel */}
      <section className="relative w-full h-full flex flex-col justify-center bg-gradient-to-b from-white via-[#FCFDFE] to-[#F6FAFF] px-6 py-8 md:px-10 lg:px-16 overflow-hidden">
        {/* Subtle Ambient Orbs */}
        <div aria-hidden="true" className="bg-orb-top pointer-events-none absolute -top-28 -right-28 w-[340px] h-[340px] rounded-full opacity-65" />
        <div aria-hidden="true" className="bg-orb-bottom pointer-events-none absolute -bottom-32 -left-24 w-[300px] h-[300px] rounded-full opacity-45" />

        {/* Vertically & Horizontally Centered Form Container */}
        <div className="relative z-10 w-full max-w-[420px] mx-auto my-auto bg-white/85 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-slate-100/90 shadow-[0_24px_60px_-15px_rgba(20,71,198,0.12),0_4px_20px_-2px_rgba(15,23,42,0.04)]">
          {/* Top Header Row: Custom VetAura Wordmark Logo (Left) + Pill Badge (Right) */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="inline-flex items-center shrink-0">
              <VetAuraLogo className="h-7 sm:h-8 w-auto" />
            </div>

            {/* Soft Blue Pill Badge */}
            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#E6F0FF] text-[#2563EB] tracking-tight">
              Complaint Management System
            </span>
          </div>

          {/* Notice Alert (e.g. Session Timed Out) */}
          {notice && !error && (
            <div className="mb-4 rounded-xl px-4 py-2.5 text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span>{notice}</span>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div role="alert" className="mb-4 rounded-xl px-4 py-2.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 flex items-center gap-2">
              <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span>{error.message || 'Authentication failed. Please check your credentials.'}</span>
            </div>
          )}

          {/* Sign-In Form */}
          <form onSubmit={submit} className="space-y-4" noValidate>
            {/* Email Field */}
            <div>
              <label htmlFor="loginEmail" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                id="loginEmail"
                name="email"
                autoComplete="username"
                required
                autoFocus
                placeholder="name@vetaura.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-[#1447C6] focus:ring-4 focus:ring-[#1447C6]/12 transition"
              />
            </div>

            {/* Password Field with Show/Hide Toggle */}
            <div>
              <label htmlFor="loginPassword" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="loginPassword"
                  name="password"
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-[#1447C6] focus:ring-4 focus:ring-[#1447C6]/12 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 px-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none focus:text-[#1447C6] transition-colors"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Primary CTA Button: Full-Width Pill-Shaped Royal Blue Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 px-6 rounded-full bg-[#1447C6] hover:bg-[#0F38A3] active:scale-[0.99] text-white font-semibold text-sm shadow-[0_10px_24px_-6px_rgba(20,71,198,0.45)] transition-all duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-blue-500/30 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {busy ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Signing In...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </div>

            {/* Centered Secondary Link Below Button */}
            <div className="text-center pt-1">
              <Link
                to="/forgot-password"
                className="text-xs sm:text-sm font-medium text-[#2563EB] hover:text-[#1447C6] hover:underline focus:outline-none transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

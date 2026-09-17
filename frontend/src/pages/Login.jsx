import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const inputCls =
  'w-full bg-night px-4 py-3.5 rounded-xl border border-line text-bone placeholder:text-bone-faint focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent/50 transition-colors';

const STEPS = ['Enquiry', 'Quotation', 'Sales Order', 'Reservation', 'Dispatch'];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-night text-bone grid lg:grid-cols-2">
      <section className="flex items-center justify-center p-6 md:p-14 border-r border-line bg-white">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5 lg:hidden mb-10">
            <span className="inline-block h-3 w-3 rotate-45 rounded-[3px] bg-accent" />
            <span className="font-display font-semibold text-xl text-bone">Zenitek</span>
          </div>

          <p className="font-mono text-[0.66rem] uppercase tracking-[0.2em] text-bone-faint mb-4">
            <span className="text-accent">Welcome back</span> — account access
          </p>
          <h2 className="font-display text-3xl font-medium tracking-[-0.01em] text-bone leading-tight">
            Sign in to your account.
          </h2>
          <p className="mt-2 text-sm text-bone-muted">Enter your credentials to continue.</p>

          <form onSubmit={onSubmit} className="mt-10 space-y-6">
            <label className="block">
              <span className="mb-2 block font-mono text-[0.62rem] uppercase tracking-[0.18em] text-bone-faint">Email</span>
              <input
                type="email"
                required
                className={inputCls}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </label>
            <label className="block">
              <span className="mb-2 block font-mono text-[0.62rem] uppercase tracking-[0.18em] text-bone-faint">Password</span>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className={`${inputCls} pr-12`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-bone-faint hover:text-bone transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                    {showPassword ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                        <path d="M1 1l22 22" />
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-accent px-6 py-4 text-sm font-semibold text-white hover:bg-accent-dark shadow-card disabled:opacity-60 transition-colors"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-10 border border-line bg-night rounded-2xl p-4">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-bone-faint mb-2">Demo credentials</p>
            <ul className="space-y-1 text-xs text-bone-muted">
              <li>
                Admin: <span className="font-semibold text-accent-dark">admin@erp.com</span> / <span className="font-semibold text-accent-dark">admin123</span>
              </li>
              <li>
                Sales: <span className="font-semibold text-accent-dark">sales@erp.com</span> / <span className="font-semibold text-accent-dark">sales123</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="relative hidden lg:flex flex-col justify-between bg-[#16181D] p-14 overflow-hidden">
        <div className="absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-accent/[0.12] blur-3xl" />

        <div className="relative flex items-center gap-2.5">
          <span className="inline-block h-3 w-3 rotate-45 rounded-[3px] bg-white" />
          <span className="font-display font-semibold text-xl tracking-[-0.01em] text-white">Zenitek</span>
        </div>

        <div className="relative">
          <p className="font-mono text-[0.66rem] uppercase tracking-[0.22em] text-white/40 mb-6">
            <span className="text-white">//</span> Manufacturing &amp; Supply Platform
          </p>
          <h1 className="font-display text-5xl xl:text-6xl font-bold leading-[1.02] tracking-[-0.02em] text-white max-w-xl">
            Run your pipeline on <span className="text-white underline decoration-accent-bright decoration-4 underline-offset-8">trust</span>.
          </h1>
          <p className="mt-6 max-w-sm text-white/55 leading-relaxed">
            Enquiry, quotation, sales order, reservation, dispatch — one clean,
            audited workflow built for manufacturing teams.
          </p>
        </div>

        <div className="relative">
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <span className="h-px w-6 bg-white/15" />}
                <span className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/70">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
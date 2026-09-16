import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Button from '../components/ui/Button';
import { inputCls, Field } from '../components/ui/Field';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xl font-black">Z</div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800">Zenitek ERP</h1>
              <p className="text-sm text-slate-400">Manufacturing &amp; Supply Platform</p>
            </div>
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">Sign in to your account</h2>
          <p className="text-sm text-slate-500 mb-6">Enter your credentials to continue</p>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Email" required>
              <input type="email" required className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            </Field>
            <Field label="Password" required>
              <input type="password" required className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </Field>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</Button>
          </form>
          <div className="mt-6 rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-500">
            <p className="font-semibold text-slate-600 mb-1">Demo credentials</p>
            <p>Admin: <code className="text-blue-700">admin@erp.com</code> / <code className="text-blue-700">admin123</code></p>
            <p>Sales: <code className="text-blue-700">sales@erp.com</code> / <code className="text-blue-700">sales123</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}
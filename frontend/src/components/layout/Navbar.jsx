import { useAuth } from '../../context/AuthContext';
import { initials } from '../../utils/formatters';

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black">Z</div>
        <div>
          <div className="font-bold text-slate-800 leading-tight">Zenitek ERP</div>
          <div className="text-xs text-slate-400 leading-tight">Manufacturing &amp; Supply</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">{initials(user?.name)}</div>
        <div className="hidden sm:block">
          <div className="text-sm font-semibold text-slate-800">{user?.name}</div>
          <div className="text-xs text-slate-400">{user?.role === 'ADMIN' ? 'Administrator' : 'Sales User'}</div>
        </div>
        <button onClick={logout} className="ml-2 text-sm text-slate-500 hover:text-rose-600 font-medium">Sign out</button>
      </div>
    </header>
  );
}
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/enquiries', label: 'Enquiries', icon: ['M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8'] },
  { to: '/quotations', label: 'Quotations', icon: ['M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', 'M7.5 15.5l2 2 4-4'] },
  { to: '/sales-orders', label: 'Sales Orders', icon: ['M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', 'M9 12h.01', 'M9 16h.01', 'M13 12h3', 'M13 16h3'] },
];

const ADMIN_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M13 13h7v7h-7z', 'M4 13h7v7H4z'] },
  { to: '/dispatch', label: 'Dispatch', icon: ['M1 4h14v12H1z', 'M15 7h3l3 3v6h-6V7z', 'M5.5 19a2 2 0 100-4 2 2 0 000 4z', 'M18.5 19a2 2 0 100-4 2 2 0 000 4z'] },
];

function navItems(isAdmin) {
  return isAdmin ? [...ADMIN_ITEMS, ...NAV_ITEMS] : NAV_ITEMS;
}

function BrandMark() {
  return (
    <span className="flex items-center justify-center gap-3 px-1">
      <span className="inline-block h-3 w-3 rotate-45 rounded-[2px] bg-accent flex-shrink-0" />
      <span className="hidden group-hover:block font-display font-semibold text-lg text-bone whitespace-nowrap">Zenitek</span>
    </span>
  );
}

function NavList({ onNavigate }) {
  const { logout, user } = useAuth();
  const items = navItems(user?.role === 'ADMIN');
  return (
    <>
      <nav className="flex-1 flex flex-col gap-1.5">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group/nav flex items-center justify-center group-hover:justify-start gap-3 h-11 rounded-xl transition-colors ${
                isActive
                  ? 'bg-accent text-white'
                  : 'text-bone-muted hover:text-bone hover:bg-night-raise'
              }`
            }
          >
            <svg className="w-[22px] h-[22px] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              {it.icon.map((d, i) => <path key={i} d={d} />)}
            </svg>
            <span className="hidden group-hover:block text-sm font-medium whitespace-nowrap">{it.label}</span>
          </NavLink>
        ))}
      </nav>
      <button
        onClick={logout}
        className="flex items-center justify-center group-hover:justify-start gap-3 h-11 rounded-xl text-bone-muted hover:text-bone hover:bg-night-raise transition-colors"
        title="Sign out"
      >
        <svg className="w-[22px] h-[22px] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M17 16l4-4m0 0l-4-4m4 4H7" />
          <path d="M7 4H5a2 2 0 00-2 2v12a2 2 0 002 2h2" />
        </svg>
        <span className="hidden group-hover:block text-sm font-medium whitespace-nowrap">Sign out</span>
      </button>
    </>
  );
}

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const items = navItems(user?.role === 'ADMIN');
  return (
    <>
      {/* Desktop rail — expands on hover */}
      <aside className="group hidden md:flex fixed top-0 left-0 h-screen z-40 p-3 pl-4">
        <div className="flex-1 flex flex-col bg-white rounded-[24px] border border-line px-3 py-6 w-[84px] group-hover:w-60 overflow-hidden transition-all duration-300 shadow-card">
          <BrandMark />
          <div className="my-5 h-px w-full bg-line-soft" />
          <NavList />
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
          <div className="absolute left-0 top-0 h-full w-72 bg-white rounded-r-[24px] px-4 py-6 shadow-drawer flex flex-col animate-[slideIn_.25s_ease]">
            <div className="px-2 mb-6 flex items-center justify-between">
              <span className="flex items-center gap-2.5">
                <span className="inline-block h-3 w-3 rotate-45 rounded-[2px] bg-accent" />
                <span className="font-display font-semibold text-lg text-bone">Zenitek</span>
              </span>
              <button onClick={onClose} className="text-bone-faint hover:text-bone p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <nav className="flex-1 space-y-1">
              {items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.to === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive ? 'bg-accent text-white' : 'text-bone-muted hover:text-bone hover:bg-night-raise'
                    }`
                  }
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    {it.icon.map((d, i) => <path key={i} d={d} />)}
                  </svg>
                  {it.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}
      <style>{`@keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>
    </>
  );
}
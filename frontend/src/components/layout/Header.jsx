import { useMemo, useState, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { initials } from '../../utils/formatters';

const PAGE_META = {
  '/': { title: 'Enquiries', subtitle: 'Customer enquiries with product demand' },
  '/dashboard': { title: 'Dashboard', subtitle: 'Sales pipeline, revenue and inventory at a glance' },
  '/enquiries': { title: 'Enquiries', subtitle: 'Create and view customer enquiries' },
  '/quotations': { title: 'Quotations', subtitle: 'Create quotations and accept or reject them' },
  '/sales-orders': { title: 'Sales Orders', subtitle: 'Confirm / reserve stock and process dispatch' },
  '/dispatch': { title: 'Dispatch', subtitle: 'Dispatch confirmed sales orders and move stock' },
};

const BASE_SUGGESTIONS = [
  { label: 'Enquiries', to: '/enquiries' },
  { label: 'Quotations', to: '/quotations' },
  { label: 'Sales Orders', to: '/sales-orders' },
];

const RANGES = ['All time', 'This month', 'This quarter', 'This year'];

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const meta = PAGE_META[pathname] || PAGE_META['/'];
  const [query, setQuery] = useState('');
  const [range, setRange] = useState(RANGES[0]);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const searchRef = useRef(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const suggestions = user?.role === 'ADMIN'
      ? [{ label: 'Dashboard', to: '/dashboard' }, ...BASE_SUGGESTIONS, { label: 'Dispatch', to: '/dispatch' }]
      : BASE_SUGGESTIONS;
    return suggestions.filter((s) => s.label.toLowerCase().includes(q)).slice(0, 5);
  }, [query, user]);

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-white/90 border-b border-line">
      <div className="flex items-center gap-4 flex-wrap px-6 lg:px-10 py-5">
        <button
          onClick={onMenuClick}
          className="md:hidden -ml-2 p-2 rounded-xl text-bone-muted hover:text-bone hover:bg-night-raise transition-colors"
          aria-label="Open navigation"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>

        <div className="min-w-0">
          <h1 className="font-display text-[1.625rem] lg:text-[2rem] font-bold tracking-[-0.01em] text-bone leading-tight truncate">
            {meta.title}
          </h1>
          <p className="text-[0.8125rem] text-bone-muted truncate">{meta.subtitle}</p>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <div className="relative hidden sm:block w-64 lg:w-72" ref={searchRef}>
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-bone-faint" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 120)}
              placeholder="Search modules..."
              className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-2xl bg-white border border-line text-bone placeholder:text-bone-faint focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent/50 transition"
            />
            {focused && results.length > 0 && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-line rounded-2xl shadow-soft overflow-hidden py-1.5 z-40">
                {results.map((r) => (
                  <Link key={r.to} to={r.to} className="flex items-center gap-2.5 px-4 py-2 text-sm text-bone hover:bg-night hover:text-accent-dark transition-colors">
                    <svg className="w-4 h-4 text-bone-faint" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    {r.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setRangeOpen((v) => !v)}
              className="flex items-center gap-2 px-3.5 py-2.5 text-sm rounded-2xl bg-white border border-line text-bone-muted hover:text-bone hover:border-accent/40 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              <span className="hidden lg:inline">{range}</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
            </button>
            {rangeOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-line rounded-2xl shadow-soft overflow-hidden py-1.5 z-40">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    onClick={() => { setRange(r); setRangeOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${range === r ? 'text-accent-dark font-semibold' : 'text-bone-muted hover:text-bone hover:bg-night'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pl-3 border-l border-line">
            <span className="h-10 w-10 rounded-full bg-accent text-white flex items-center justify-center text-sm font-bold">
              {initials(user?.name)}
            </span>
            <div className="hidden xl:block text-right">
              <div className="text-sm font-semibold text-bone leading-tight">{user?.name}</div>
              <div className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-bone-faint leading-tight">{user?.role === 'ADMIN' ? 'Administrator' : 'Sales User'}</div>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="hidden lg:flex p-2.5 rounded-xl text-bone-muted hover:text-bone hover:bg-night-raise border border-line transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7" />
                <path d="M7 4H5a2 2 0 00-2 2v12a2 2 0 002 2h2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
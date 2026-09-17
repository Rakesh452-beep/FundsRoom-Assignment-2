import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi, customerApi, enquiryApi, salesOrderApi, inventoryApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import StatusBadge from '../components/shared/StatusBadge';
import { formatINR, formatDate } from '../utils/formatters';

const PIPE_STEPS = [
  { key: 'enquiries', label: 'Enquiries' },
  { key: 'quotations', label: 'Quotations' },
  { key: 'won', label: 'Won' },
  { key: 'salesOrders', label: 'Sales Orders' },
  { key: 'dispatched', label: 'Dispatched' },
];

const fmtShort = (v) => {
  const n = Number(v || 0);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `₹${n}`;
};

const niceCeil = (v) => {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * p;
};

const monthLabel = (d) => new Date(d).toLocaleDateString('en-IN', { month: 'short' });

function buildSeries(orders) {
  const buckets = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ key: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`, label: dt.toLocaleDateString('en-IN', { month: 'short' }), value: 0 });
  }
  for (const so of orders) {
    const key = `${new Date(so.orderDate).getFullYear()}-${String(new Date(so.orderDate).getMonth() + 1).padStart(2, '0')}`;
    const b = buckets.find((x) => x.key === key);
    if (b) b.value += Number(so.totalAmount || 0);
  }
  return buckets;
}

function LineChart({ data }) {
  const [hover, setHover] = useState(null);
  const W = 660;
  const H = 250;
  const PAD = { l: 44, r: 12, t: 18, b: 30 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const max = niceCeil(Math.max(...data.map((d) => d.value), 1));
  const x = (i) => PAD.l + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v) => PAD.t + innerH - (v / max) * innerH;
  const ticks = 4;
  const line = (p) => {
    if (p.length === 1) return `M${x(0)} ${y(p[0].value)}`;
    let d = `M${x(0)} ${y(p[0].value)}`;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] || p[i];
      const p1 = p[i];
      const p2 = p[i + 1];
      const p3 = p[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  };
  const pts = data.map((d, i) => ({ ...d, x: x(i), y: y(d.value) }));
  const area = `${line(pts)} L${x(data.length - 1).toFixed(1)} ${PAD.t + innerH} L${x(0).toFixed(1)} ${PAD.t + innerH} Z`;

  const last = pts.length - 1;

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" onMouseLeave={() => setHover(null)}>
        {Array.from({ length: ticks + 1 }).map((_, i) => {
          const v = (max / ticks) * i;
          const gy = y(v);
          return (
            <g key={i}>
              <line x1={PAD.l} x2={W - PAD.r} y1={gy} y2={gy} stroke="#E5E7EB" strokeWidth="1" />
              <text x={PAD.l - 8} y={gy + 3.5} textAnchor="end" fontSize="10" fill="#6B7280">{fmtShort(v)}</text>
            </g>
          );
        })}
        <path d={area} fill="#1F2937" fillOpacity="0.06" />
        <path d={line(pts)} fill="none" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {hover !== null && (
          <line x1={pts[hover].x} x2={pts[hover].x} y1={PAD.t - 4} y2={PAD.t + innerH} stroke="#9CA3AF" strokeWidth="1" strokeDasharray="4 4" />
        )}
        {pts.map((p, i) => (
          <rect
            key={`hit${i}`}
            x={p.x - innerW / data.length / 2}
            y={PAD.t}
            width={innerW / data.length}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
        {pts.map((p, i) => (
          <g key={`pt${i}`}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hover === i ? 5 : 3}
              fill={hover === i ? '#111827' : '#fff'}
              stroke="#111827"
              strokeWidth={hover === i ? 2.5 : 2}
            />
          </g>
        ))}
        {pts.map((p, i) => (
          <text
            key={`l${i}`}
            x={p.x}
            y={H - 8}
            textAnchor="middle"
            fontSize="10.5"
            fill={hover === i ? '#111827' : '#6B7280'}
            fontWeight={hover === i ? 700 : 400}
          >
            {p.label}
          </text>
        ))}
      </svg>
      {hover !== null && (
        <div
          className="absolute pointer-events-none z-10 bg-bone text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-soft whitespace-nowrap"
          style={{
            left: `${(pts[hover].x / W) * 100}%`,
            top: 4,
            transform: hover === 0 ? 'translateX(0%)' : hover === last ? 'translateX(-100%)' : 'translateX(-50%)',
          }}
        >
          {pts[hover].label} · {formatINR(pts[hover].value)}
        </div>
      )}
    </div>
  );
}

const ICONS = {
  customers: ['M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'],
  enquiries: ['M3 8l9 5 9-5V5a1 1 0 00-1-1H4a1 1 0 00-1 1v3z', 'M21 8v11a1 1 0 01-1 1H4a1 1 0 01-1-1V8l9 5 9-5z'],
  orders: ['M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', 'M9 12h.01', 'M9 16h.01', 'M13 12h3', 'M13 16h3'],
  inventory: ['M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'],
};

function StatCard({ label, value, delta, icon }) {
  return (
    <div className="bg-white border border-line rounded-2xl p-6 lg:p-7 flex flex-col gap-5 hover:shadow-soft transition-shadow duration-300">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[0.85rem] font-medium text-bone-muted leading-snug pt-1">{label}</span>
        <span className="h-10 w-10 rounded-lg bg-night-raise flex items-center justify-center flex-shrink-0 text-bone-soft">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            {icon.map((d, i) => <path key={i} d={d} />)}
          </svg>
        </span>
      </div>
      <div>
        <div className="font-display text-[2rem] lg:text-[2.25rem] font-bold tracking-[-0.01em] text-bone leading-none">{value}</div>
        <div className="mt-2.5 text-xs text-bone-faint">{delta}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    Promise.all([
      dashboardApi.summary().then((r) => r.data),
      customerApi.list().then((r) => r.data),
      enquiryApi.list({ status: 'NEW', page: 1, limit: 1 }).then((r) => r.data),
      salesOrderApi.list({ status: 'PENDING', page: 1, limit: 1 }).then((r) => r.data),
      salesOrderApi.list({ status: 'CONFIRMED', page: 1, limit: 1 }).then((r) => r.data),
      salesOrderApi.list({ page: 1, limit: 100 }).then((r) => r.data),
      inventoryApi.list().then((r) => r.data),
    ])
      .then(([sum, customers, pendingEnqs, pendingSo, confirmedSo, orders, inventory]) => {
        const availableQty = inventory.reduce((s, i) => s + i.availableQty, 0);
        const lowStockCount = inventory.filter((i) => i.lowStock).length;
        setData({
          funnel: sum.funnel,
          alerts: sum.alerts,
          topProducts: sum.topProducts,
          customers: customers.length,
          pendingEnquiries: pendingEnqs.total,
          activeOrders: pendingSo.total + confirmedSo.total,
          availableQty,
          lowStockCount,
          series: buildSeries(orders.items || []),
          recentOrders: (orders.items || []).slice(0, 6),
        });
      })
      .catch(() => {});
  }, []);

  if (!data) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Spinner />
    </div>
  );

  const maxCount = Math.max(...PIPE_STEPS.map((s) => data.funnel[s.key] ?? 0), 1);

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          label="Total Customers"
          value={Intl.NumberFormat('en-IN').format(data.customers)}
          delta="Customer master records"
          icon={ICONS.customers}
        />
        <StatCard
          label="Pending Enquiries"
          value={Intl.NumberFormat('en-IN').format(data.pendingEnquiries)}
          delta="New · awaiting quotation"
          icon={ICONS.enquiries}
        />
        <StatCard
          label="Active Sales Orders"
          value={Intl.NumberFormat('en-IN').format(data.activeOrders)}
          delta="Pending confirm or dispatch"
          icon={ICONS.orders}
        />
        <StatCard
          label="Available Inventory"
          value={Intl.NumberFormat('en-IN').format(data.availableQty)}
          delta={`${data.lowStockCount} low-stock product${data.lowStockCount === 1 ? '' : 's'}`}
          icon={ICONS.inventory}
        />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 card p-6 lg:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="font-display text-lg lg:text-xl font-semibold text-bone">Sales Order Value</h2>
              <p className="text-sm text-bone-muted mt-0.5">Hover over any month to see its value</p>
            </div>
            <div className="text-right">
              <div className="font-display text-2xl font-bold tracking-[-0.01em] text-bone">{formatINR(data.funnel.revenue)}</div>
              <div className="text-xs text-bone-muted mt-0.5">Confirmed + dispatched revenue</div>
            </div>
          </div>
          {data.series.every((d) => d.value === 0) ? (
            <div className="h-64 flex items-center justify-center text-sm text-bone-faint">
              No sales order value yet — convert accepted quotations to see trends.
            </div>
          ) : (
            <LineChart data={data.series} />
          )}
        </div>

        <div className="card p-6 lg:p-7">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-bone">Recent Sales Orders</h2>
            <Link to="/sales-orders" className="text-sm font-medium text-bone-muted hover:text-bone transition-colors">View all</Link>
          </div>
          {data.recentOrders.length === 0 ? (
            <p className="text-sm text-bone-faint py-8 text-center">No sales orders yet.</p>
          ) : (
            <ul className="divide-y divide-line-soft">
              {data.recentOrders.map((so) => (
                <li key={so.id} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-bone">{so.orderNumber}</span>
                        <StatusBadge status={so.status} />
                      </div>
                      <div className="text-sm text-bone-muted truncate mt-1">{so.customer.companyName}</div>
                      <div className="text-xs text-bone-faint mt-0.5">{formatDate(so.orderDate)}</div>
                    </div>
                    <div className="text-sm font-bold text-bone whitespace-nowrap">{formatINR(so.totalAmount)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-6 lg:p-7">
          <h2 className="font-display text-lg font-semibold text-bone mb-1">Pipeline Status</h2>
          <p className="text-xs text-bone-faint mb-5">Enquiry → Quotation → Won → Order → Dispatch</p>

          <div className="hidden lg:flex items-stretch gap-1.5">
            {PIPE_STEPS.map((s, i) => {
              const v = data.funnel[s.key] ?? 0;
              const prev = i > 0 ? (data.funnel[PIPE_STEPS[i - 1].key] ?? 0) : 0;
              const conv = i > 0 ? (prev > 0 ? Math.round((v / prev) * 100) : 0) : null;
              const pct = v && maxCount ? Math.round((v / maxCount) * 100) : 0;
              return (
                <Fragment key={s.key}>
                  {i > 0 && (
                    <div className="flex flex-col items-center justify-center gap-1 min-w-[44px]">
                      <svg className="w-4 h-4 text-bone-faint" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                      <span className={`text-xs font-bold ${conv === 100 ? 'text-success' : 'text-bone-muted'}`}>{conv}%</span>
                    </div>
                  )}
                  <div className="flex-1 rounded-xl border border-line bg-night p-4 text-center">
                    <div className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-bone-faint">{s.label}</div>
                    <div className="mt-2 font-display text-2xl font-bold text-bone leading-none">{v}</div>
                    <div className="mt-2.5 h-1 bg-line rounded-full overflow-hidden">
                      <div className={`h-full ${s.key === 'dispatched' ? 'bg-success' : 'bg-bone-soft'} rounded-full`} style={{ width: `${Math.max(pct, 2)}%` }} />
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </div>

          <div className="lg:hidden space-y-1.5">
            {PIPE_STEPS.map((s, i) => {
              const v = data.funnel[s.key] ?? 0;
              const prev = i > 0 ? (data.funnel[PIPE_STEPS[i - 1].key] ?? 0) : 0;
              const conv = i > 0 ? (prev > 0 ? Math.round((v / prev) * 100) : 0) : null;
              const pct = v && maxCount ? Math.round((v / maxCount) * 100) : 0;
              return (
                <Fragment key={s.key}>
                  {i > 0 && (
                    <div className="flex items-center gap-2 pl-1 text-xs font-bold text-bone-muted">
                      <span className={`h-2 w-2 rounded-full ${conv === 100 ? 'bg-success' : 'bg-bone-soft'}`} />
                      <span>{conv}% of previous stage</span>
                    </div>
                  )}
                  <div className="rounded-xl border border-line bg-night px-4 py-3.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-bone-faint">{s.label}</div>
                      <div className="mt-1 font-display text-xl font-bold text-bone leading-none">{v}</div>
                    </div>
                    <div className="w-24 h-1 bg-line rounded-full overflow-hidden">
                      <div className={`h-full ${s.key === 'dispatched' ? 'bg-success' : 'bg-bone-soft'} rounded-full`} style={{ width: `${Math.max(pct, 2)}%` }} />
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </div>

          <p className="mt-5 text-xs text-bone-faint border-t border-line-soft pt-4">
            Stage counts with the conversion rate passed between each step. Green indicates a full 100% conversion.
          </p>
        </div>

        <div className="card p-6 lg:p-7">
          <h2 className="font-display text-lg font-semibold text-bone mb-5">Top Products</h2>
          {data.topProducts.length === 0 ? (
            <p className="text-sm text-bone-faint py-8 text-center">No orders yet.</p>
          ) : (
            <ul className="space-y-4">
              {data.topProducts.map((t, i) => (
                <li key={t.product.id} className="flex items-center gap-3">
                  <span className="h-9 w-9 rounded-lg bg-night-raise flex items-center justify-center font-mono text-xs font-bold text-bone-muted">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-bone truncate">{t.product.name}</div>
                    <div className="text-xs text-bone-faint">{t.product.code}</div>
                  </div>
                  <div className="text-sm font-bold text-bone">{t.totalQty} <span className="text-xs font-normal text-bone-faint">{t.product.unit}</span></div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-6 lg:p-7">
          <h2 className="font-display text-lg font-semibold text-bone mb-5">Low Stock Alerts</h2>
          {data.alerts.length === 0 ? (
            <div className="py-8 text-center">
              <span className="inline-flex h-11 w-11 rounded-lg bg-success-soft text-success items-center justify-center mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
              </span>
              <p className="text-sm text-bone-muted">No low-stock alerts. All products are healthy.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {data.alerts.slice(0, 6).map((a) => (
                <li key={a.product.id} className="flex items-center justify-between gap-3 rounded-xl bg-warning-soft border border-[#FDE68A] px-3.5 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-bone truncate">{a.product.name}</div>
                    <div className="text-xs text-bone-faint mt-0.5">Only {a.availableQty} {a.product.unit} available</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[0.65rem] font-bold uppercase tracking-wide bg-[#FDE68A] text-warning flex-shrink-0">Low</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
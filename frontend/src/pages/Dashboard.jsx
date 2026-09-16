import { useEffect, useState } from 'react';
import { dashboardApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import { formatINR } from '../utils/formatters';

const funnelSteps = [
  { key: 'enquiries', label: 'Enquiries', color: 'bg-blue-500' },
  { key: 'quotations', label: 'Quotations', color: 'bg-indigo-500' },
  { key: 'won', label: 'Won', color: 'bg-emerald-500' },
  { key: 'salesOrders', label: 'Orders', color: 'bg-amber-500' },
  { key: 'dispatched', label: 'Dispatched', color: 'bg-purple-500' },
];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    dashboardApi.summary().then((r) => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <Spinner />;

  const maxCount = Math.max(...funnelSteps.map((s) => data.funnel[s.key] ?? 0), 1);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
      <p className="text-sm text-slate-500 mb-6">Welcome back, {user?.name}</p>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {funnelSteps.map((s) => (
          <div key={s.key} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
              <span className="text-xs font-medium text-slate-500">{s.label}</span>
            </div>
            <div className="text-3xl font-extrabold text-slate-800">{data.funnel[s.key] ?? 0}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-800 mb-4">Pipeline Funnel</h3>
          {funnelSteps.map((s) => {
            const v = data.funnel[s.key] ?? 0;
            const pct = v && maxCount ? Math.round((v / maxCount) * 100) : 0;
            return (
              <div key={s.key} className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600 font-medium">{s.label}</span>
                  <span className="text-slate-400">{v}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${s.color} rounded-full transition-all`} style={{ width: `${Math.max(pct, 4)}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-800 mb-4">Revenue (confirmed)</h3>
          <div className="text-2xl font-extrabold text-emerald-600">{formatINR(data.funnel.revenue)}</div>
          <p className="text-xs text-slate-400 mt-1">from confirmed & dispatched orders</p>
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Top Products</h4>
            {data.topProducts?.length ? (
              <ul className="space-y-2">
                {data.topProducts.map((t) => (
                  <li key={t.product.id} className="flex justify-between text-sm">
                    <span className="text-slate-600">{t.product.name}</span>
                    <span className="font-semibold text-slate-800">{t.totalQty} {t.product.unit}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-slate-400">No orders yet.</p>}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-800 mb-3">Inventory Alerts</h3>
        {data.alerts?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {data.alerts.map((a) => (
              <div key={a.product.id} className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-rose-800">{a.product.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">LOW</span>
                </div>
                <p className="text-xs text-rose-600 mt-1">Only {a.availableQty} {a.product.unit} available (threshold 50)</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No low-stock alerts. All good!</p>
        )}
      </div>
    </div>
  );
}
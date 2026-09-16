import { useCallback, useEffect, useState } from 'react';
import { inventoryApi } from '../api/endpoints';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import { Field, inputCls } from '../components/ui/Field';
import { formatINR } from '../utils/formatters';

export default function Inventory() {
  const [data, setData] = useState(null);
  const [adjust, setAdjust] = useState(null);
  const [delta, setDelta] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const { hasRole } = useAuth();

  const load = useCallback(async () => {
    const res = await inventoryApi.list();
    setData(res.data);
  }, []);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const submitAdjust = async () => {
    if (!delta || Number(delta) === 0) return toast.error('Enter a non-zero stock change');
    setSubmitting(true);
    try {
      await inventoryApi.adjust(adjust.productId, Number(delta));
      toast.success('Inventory updated');
      setAdjust(null);
      setDelta(0);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const summary = data ? {
    products: data.length,
    totalPhysical: data.reduce((s, i) => s + i.physicalQty, 0),
    totalReserved: data.reduce((s, i) => s + i.reservedQty, 0),
    lowStock: data.filter((i) => i.lowStock).length,
  } : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Inventory</h1>
      <p className="text-sm text-slate-500 mb-6">Stock levels, reservations and availability</p>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5"><div className="text-xs text-slate-500">Products</div><div className="text-2xl font-extrabold text-slate-800">{summary.products}</div></div>
          <div className="bg-white rounded-xl border border-slate-200 p-5"><div className="text-xs text-slate-500">Total physical</div><div className="text-2xl font-extrabold text-slate-800">{summary.totalPhysical}</div></div>
          <div className="bg-white rounded-xl border border-slate-200 p-5"><div className="text-xs text-slate-500">Reserved</div><div className="text-2xl font-extrabold text-amber-600">{summary.totalReserved}</div></div>
          <div className="bg-white rounded-xl border border-slate-200 p-5"><div className="text-xs text-slate-500">Low stock</div><div className={`text-2xl font-extrabold ${summary.lowStock ? 'text-rose-600' : 'text-emerald-600'}`}>{summary.lowStock}</div></div>
        </div>
      )}

      {!data ? <Spinner /> : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {['Code', 'Product', 'Category', 'Unit', 'Base Price', 'Physical', 'Reserved', 'Available', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
                {hasRole('ADMIN') && <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-600">{inv.product.code}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{inv.product.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{inv.product.category}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{inv.product.unit}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatINR(inv.product.basePrice)}</td>
                  <td className="px-4 py-3 text-sm font-semibold">{inv.physicalQty}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-amber-600">{inv.reservedQty}</td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-800">{inv.availableQty}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${inv.lowStock ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {inv.lowStock ? 'LOW' : 'OK'}
                    </span>
                  </td>
                  {hasRole('ADMIN') && (
                    <td className="px-4 py-3"><Button variant="secondary" size="sm" onClick={() => { setAdjust(inv); setDelta(0); }}>Adjust</Button></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={Boolean(adjust)} onClose={() => setAdjust(null)} title={`Adjust stock — ${adjust?.product?.name || ''}`}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Current physical: <b>{adjust?.physicalQty}</b> · Reserved: <b>{adjust?.reservedQty}</b></p>
          <Field label="Quantity change" hint="Positive adds stock, negative removes. Cannot go below reserved.">
            <input type="number" className={inputCls} value={delta} onChange={(e) => setDelta(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setAdjust(null)}>Cancel</Button>
            <Button variant="primary" onClick={submitAdjust} disabled={submitting}>{submitting ? 'Saving...' : 'Update Stock'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
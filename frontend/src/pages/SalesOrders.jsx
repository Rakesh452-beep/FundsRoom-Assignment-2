import { useCallback, useEffect, useState } from 'react';
import { salesOrderApi } from '../api/endpoints';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import ConfirmModal from '../components/ui/ConfirmModal';
import Pagination from '../components/ui/Pagination';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import StatusBadge from '../components/shared/StatusBadge';
import { Field, inputCls } from '../components/ui/Field';
import { formatDate, formatINR } from '../utils/formatters';

export default function SalesOrders() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [detail, setDetail] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [dispatchForm, setDispatchForm] = useState({ vehicleNo: '', driver: '' });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const { hasRole } = useAuth();

  const load = useCallback(async () => {
    const res = await salesOrderApi.list({ page, limit: 10, status: status || undefined });
    setData(res.data);
  }, [page, status]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const openDetail = async (id) => {
    const res = await salesOrderApi.get(id);
    setDetail(res.data);
  };

  const doConfirm = async () => {
    setSubmitting(true);
    try {
      const a = confirmAction;
      if (a.type === 'confirm') {
        await salesOrderApi.confirm(a.id);
        toast.success('Sales order confirmed — inventory reserved');
      } else if (a.type === 'dispatch') {
        await salesOrderApi.dispatch(a.id, { vehicleNo: a.vehicleNo, driver: a.driver || undefined });
        toast.success('Dispatch completed — stock moved');
      } else if (a.type === 'cancel') {
        await salesOrderApi.cancel(a.id);
        toast.success('Sales order cancelled');
      }
      setConfirmAction(null);
      load();
      openDetail(a.id);
    } catch (err) { toast.error(err.message); setConfirmAction(null); }
    finally { setSubmitting(false); }
  };

  const insufficient = (so) => so.items.some((it) => {
    const inv = it.product?.inventory;
    return inv && it.qty > (inv.physicalQty - inv.reservedQty);
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sales Orders</h1>
          <p className="text-sm text-slate-500">Converted quotations · reservation & dispatch</p>
        </div>
        <select className="px-3 py-2 text-sm rounded-lg border border-slate-300" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {['PENDING', 'CONFIRMED', 'DISPATCHED', 'CANCELLED'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {!data ? <Spinner /> : data.items.length === 0 ? <EmptyState title="No sales orders" message="Convert accepted quotations to create orders." /> : (
        <>
          <Table headers={['Order', 'Customer', 'Quotation', 'Amount', 'Date', 'Status', 'Inventory']}>
            {data.items.map((so) => (
              <tr key={so.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => openDetail(so.id)}>
                <td className="px-4 py-3 font-semibold text-blue-700">{so.orderNumber}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-800">{so.customer.companyName}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{so.quotation.quotationNumber}</td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-800">{formatINR(so.totalAmount)}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{formatDate(so.orderDate)}</td>
                <td className="px-4 py-3"><StatusBadge status={so.status} /></td>
                <td className="px-4 py-3">
                  {so.status === 'PENDING' && insufficient(so)
                    ? <span className="text-xs text-rose-600 font-semibold">Insufficient stock</span>
                    : <span className="text-xs text-emerald-600">Checked</span>}
                </td>
              </tr>
            ))}
          </Table>
          <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}

      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title={`Sales Order ${detail?.orderNumber || ''}`} wide>
        {detail && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><div className="text-xs text-slate-400">Customer</div><div className="font-semibold text-slate-800">{detail.customer.companyName}</div></div>
              <div><div className="text-xs text-slate-400">Quotation</div><div className="text-slate-700">{detail.quotation.quotationNumber}</div></div>
              <div><div className="text-xs text-slate-400">Order date</div><div className="text-slate-700">{formatDate(detail.orderDate)}</div></div>
              <div><div className="text-xs text-slate-400">Total</div><div className="font-bold text-emerald-700">{formatINR(detail.totalAmount)}</div></div>
              <div><div className="text-xs text-slate-400">Status</div><StatusBadge status={detail.status} /></div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Items & Inventory</h4>
              <Table headers={['Product', 'Qty', 'Unit Price', 'Line Amount', 'Physical', 'Reserved', 'Available']}>
                {detail.items.map((it) => {
                  const inv = it.product?.inventory;
                  const available = inv ? inv.physicalQty - inv.reservedQty : null;
                  const low = inv && it.qty > available;
                  return (
                    <tr key={it.productId}>
                      <td className="px-4 py-2 text-sm font-medium text-slate-800">{it.product.name}</td>
                      <td className="px-4 py-2 text-sm">{it.qty} {it.product.unit}</td>
                      <td className="px-4 py-2 text-sm">{formatINR(it.unitPrice)}</td>
                      <td className="px-4 py-2 text-sm font-semibold">{formatINR(it.lineAmount)}</td>
                      <td className="px-4 py-2 text-sm">{inv?.physicalQty ?? '-'}</td>
                      <td className="px-4 py-2 text-sm">{inv?.reservedQty ?? '-'}</td>
                      <td className={`px-4 py-2 text-sm font-semibold ${low ? 'text-rose-600' : ''}`}>{available ?? '-'}</td>
                    </tr>
                  );
                })}
              </Table>
            </div>

            {detail.dispatches?.length > 0 && (
              <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                <h4 className="text-sm font-semibold text-purple-800 mb-2">Dispatch</h4>
                {detail.dispatches.map((d) => (
                  <div key={d.id} className="text-sm text-purple-900">
                    <b>{d.dispatchNumber}</b> · {formatDate(d.dispatchDate)} · Vehicle {d.vehicleNo}
                    {d.driver ? ` · Driver: ${d.driver}` : ''} · {d.items.map((i) => `${i.product.name} x${i.qty}`).join(', ')}
                  </div>
                ))}
              </div>
            )}

            {hasRole('ADMIN') && (
              <div className="flex flex-wrap gap-2">
                {detail.status === 'PENDING' && (
                  detail.items.some((it) => it.qty > ((it.product?.inventory?.physicalQty ?? 0) - (it.product?.inventory?.reservedQty ?? 0)))
                    ? <span className="text-sm font-semibold text-rose-600">Cannot confirm — insufficient available stock</span>
                    : <Button variant="primary" onClick={() => setConfirmAction({ type: 'confirm', id: detail.id, title: 'Confirm sales order?', message: 'Inventory will be reserved atomically by the database.' })}>Confirm & Reserve</Button>
                )}
                {detail.status === 'CONFIRMED' && (
                  <Button variant="success" onClick={() => setConfirmAction({ type: 'dispatch', id: detail.id, title: 'Process dispatch?', message: 'Stock will move out of inventory.', needsDispatch: true })}>Process Dispatch</Button>
                )}
                {(detail.status === 'PENDING' || detail.status === 'CONFIRMED') && (
                  <Button variant="danger" onClick={() => setConfirmAction({ type: 'cancel', id: detail.id, title: 'Cancel sales order?', message: detail.status === 'CONFIRMED' ? 'Reserved inventory will be released.' : 'This cannot be undone.' })}>Cancel</Button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {confirmAction?.needsDispatch && (
        <Modal open onClose={() => setConfirmAction(null)} title="Dispatch Details">
          <div className="space-y-4">
            <Field label="Vehicle Number" required>
              <input className={inputCls} value={dispatchForm.vehicleNo} onChange={(e) => setDispatchForm({ ...dispatchForm, vehicleNo: e.target.value })} placeholder="MH-12-AB-1234" />
            </Field>
            <Field label="Driver Name">
              <input className={inputCls} value={dispatchForm.driver} onChange={(e) => setDispatchForm({ ...dispatchForm, driver: e.target.value })} placeholder="Optional" />
            </Field>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmAction(null)}>Cancel</Button>
              <Button
                variant="success"
                disabled={submitting || !dispatchForm.vehicleNo.trim()}
                onClick={() => setConfirmAction({ ...confirmAction, needsDispatch: false, vehicleNo: dispatchForm.vehicleNo, driver: dispatchForm.driver })}
              >
                {submitting ? 'Processing...' : 'Confirm Dispatch'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {confirmAction && !confirmAction.needsDispatch && (
        <ConfirmModal
          open
          onClose={() => setConfirmAction(null)}
          onConfirm={doConfirm}
          title={confirmAction.title}
          message={confirmAction.message}
          loading={submitting}
        />
      )}
    </div>
  );
}
import { useCallback, useEffect, useState } from 'react';
import { salesOrderApi, inventoryApi } from '../api/endpoints';
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
  const [inventory, setInventory] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const { hasRole } = useAuth();

  const fetchInventory = useCallback(async () => {
    const inv = await inventoryApi.list();
    setInventory(inv.data);
  }, []);

  const load = useCallback(async () => {
    const res = await salesOrderApi.list({ page, limit: 10, status: status || undefined });
    setData(res.data);
    fetchInventory().catch(() => {});
  }, [page, status, fetchInventory]);

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
      <div className="flex flex-wrap items-center justify-end gap-4 mb-6">
        <select className="px-3 py-2 text-sm rounded-xl bg-white border border-line text-bone focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent/50" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {['PENDING', 'CONFIRMED', 'DISPATCHED', 'CANCELLED'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display text-base font-semibold text-bone">Stock Availability</h3>
            <p className="text-xs text-bone-faint">Live availability across products (physical − reserved)</p>
          </div>
        </div>
        {inventory.length === 0 ? (
          <p className="text-sm text-bone-faint py-4 text-center">No inventory records yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {inventory.slice(0, 12).map((i) => (
              <div key={i.product.id} className={`rounded-xl border px-3.5 py-3 ${i.lowStock ? 'bg-warning-soft border-[#FDE68A]' : 'bg-night border-line'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-bone truncate">{i.product.name}</div>
                    <div className="text-xs text-bone-faint mt-0.5">{i.product.code}</div>
                  </div>
                  {i.lowStock && <span className="px-2 py-0.5 rounded-full text-[0.62rem] font-bold uppercase bg-[#FDE68A] text-warning flex-shrink-0">Low</span>}
                </div>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className="font-display text-lg font-bold text-bone">{i.availableQty}</span>
                  <span className="text-xs text-bone-faint">available {i.product.unit}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!data ? <Spinner /> : data.items.length === 0 ? <EmptyState title="No sales orders" message="Convert accepted quotations to create orders." /> : (
        <>
          <Table headers={['Order', 'Customer', 'Quotation', 'Amount', 'Date', 'Status', 'Inventory']}>
            {data.items.map((so) => (
              <tr key={so.id} className="hover:bg-surface-deep cursor-pointer" onClick={() => openDetail(so.id)}>
                <td className="px-4 py-3 font-semibold text-accent-dark">{so.orderNumber}</td>
                <td className="px-4 py-3 text-sm font-medium text-ink">{so.customer.companyName}</td>
                <td className="px-4 py-3 text-sm text-ink-muted">{so.quotation.quotationNumber}</td>
                <td className="px-4 py-3 text-sm font-semibold text-ink">{formatINR(so.totalAmount)}</td>
                <td className="px-4 py-3 text-sm text-ink-soft">{formatDate(so.orderDate)}</td>
                <td className="px-4 py-3"><StatusBadge status={so.status} /></td>
                <td className="px-4 py-3">
                  {so.status === 'PENDING' && insufficient(so)
                    ? <span className="text-xs text-error font-semibold">Insufficient stock</span>
                    : <span className="text-xs text-success">Checked</span>}
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
              <div><div className="text-xs text-ink-faint">Customer</div><div className="font-semibold text-ink">{detail.customer.companyName}</div></div>
              <div><div className="text-xs text-ink-faint">Quotation</div><div className="text-ink-soft">{detail.quotation.quotationNumber}</div></div>
              <div><div className="text-xs text-ink-faint">Order date</div><div className="text-ink-soft">{formatDate(detail.orderDate)}</div></div>
              <div><div className="text-xs text-ink-faint">Total</div><div className="font-bold text-success">{formatINR(detail.totalAmount)}</div></div>
              <div><div className="text-xs text-ink-faint">Status</div><StatusBadge status={detail.status} /></div>
            </div>

            <div>
              <h4 className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-bone-faint mb-2">Items & Inventory</h4>
              <Table headers={['Product', 'Qty', 'Unit Price', 'Line Amount', 'Physical', 'Reserved', 'Available']}>
                {detail.items.map((it) => {
                  const inv = it.product?.inventory;
                  const available = inv ? inv.physicalQty - inv.reservedQty : null;
                  const low = inv && it.qty > available;
                  return (
                    <tr key={it.productId}>
                      <td className="px-4 py-2 text-sm font-medium text-ink">{it.product.name}</td>
                      <td className="px-4 py-2 text-sm">{it.qty} {it.product.unit}</td>
                      <td className="px-4 py-2 text-sm">{formatINR(it.unitPrice)}</td>
                      <td className="px-4 py-2 text-sm font-semibold">{formatINR(it.lineAmount)}</td>
                      <td className="px-4 py-2 text-sm">{inv?.physicalQty ?? '-'}</td>
                      <td className="px-4 py-2 text-sm">{inv?.reservedQty ?? '-'}</td>
                      <td className={`px-4 py-2 text-sm font-semibold ${low ? 'text-error' : ''}`}>{available ?? '-'}</td>
                    </tr>
                  );
                })}
              </Table>
            </div>

            {detail.dispatches?.length > 0 && (
              <div className="rounded-xl border border-line bg-night-raise p-4">
                <h4 className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-bone-soft mb-2">Dispatch</h4>
                {detail.dispatches.map((d) => (
                  <div key={d.id} className="text-sm text-bone-soft">
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
                    ? <span className="text-sm font-semibold text-error">Cannot confirm — insufficient available stock</span>
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
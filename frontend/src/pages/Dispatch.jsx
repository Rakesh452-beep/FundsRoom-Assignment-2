import { useCallback, useEffect, useState } from 'react';
import { dispatchApi, salesOrderApi } from '../api/endpoints';
import { useToast } from '../context/ToastContext';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { Field, inputCls, selectCls } from '../components/ui/Field';
import { formatDate } from '../utils/formatters';

export default function Dispatch() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmed, setConfirmed] = useState([]);
  const [selected, setSelected] = useState(null);
  const [vehicleNo, setVehicleNo] = useState('');
  const [driver, setDriver] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    const res = await dispatchApi.list({ page, limit: 10 });
    setData(res.data);
  }, [page]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const openCreate = async () => {
    try {
      const res = await salesOrderApi.list({ status: 'CONFIRMED', page: 1, limit: 100 });
      setConfirmed(res.data.items);
      setSelected(null);
      setVehicleNo('');
      setDriver('');
      setCreateOpen(true);
    } catch (err) { toast.error(err.message); }
  };

  const reservedOf = (it) => it.product?.inventory?.reservedQty ?? 0;
  const exceedsReserved = (so) => so.items.some((it) => it.qty > reservedOf(it));

  const doDispatch = async () => {
    setSubmitting(true);
    try {
      await salesOrderApi.dispatch(selected.id, { vehicleNo: vehicleNo.trim(), driver: driver.trim() || undefined });
      toast.success(`${selected.orderNumber} dispatched — physical & reserved reduced`);
      setCreateOpen(false);
      setTimeout(load, 150);
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-end gap-4 mb-6">
        <Button variant="primary" onClick={openCreate}>New Dispatch</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
        <div className="card p-5">
          <h3 className="font-display text-base font-semibold text-bone">How dispatch moves stock</h3>
          <p className="text-xs text-bone-faint mt-0.5">Before → After (dispatched Qty)</p>
          <div className="mt-4 flex items-center gap-3">
            {[{ k: 'Physical', before: 100, after: 40 }, { k: 'Reserved', before: 60, after: 0 }, { k: 'Available', before: 40, after: 40 }].map((r) => (
              <div key={r.k} className="flex-1 rounded-xl border border-line bg-night px-3 py-3 text-center">
                <div className="text-[0.62rem] font-semibold uppercase tracking-wider text-bone-faint">{r.k}</div>
                <div className="mt-1.5 font-display text-lg font-bold text-bone">{r.before} → {r.after}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <h3 className="font-display text-base font-semibold text-bone">Prevention rules</h3>
          <ul className="mt-4 space-y-2 text-xs text-bone-muted">
            <li className="flex items-start gap-2"><span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-error flex-shrink-0" />Dispatch beyond reserved quantity is blocked</li>
            <li className="flex items-start gap-2"><span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-error flex-shrink-0" />Duplicate dispatch of the same order is blocked</li>
            <li className="flex items-start gap-2"><span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-error flex-shrink-0" />Dispatch of a cancelled or pending order is blocked</li>
          </ul>
        </div>
        <div className="card p-5">
          <h3 className="font-display text-base font-semibold text-bone">Dispatch record</h3>
          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-bone-muted">
            {['Dispatch Number', 'Sales Order', 'Dispatch Date'].map((f) => <div key={f} className="text-bone-faint">{f}</div>)}
            {['Product(s) · Quantity', 'Vehicle Number', 'Driver Name'].map((f) => <div key={f} className="text-bone-faint">{f}</div>)}
            <div className="text-bone font-semibold">DISP-xxxx</div>
            <div className="text-bone font-semibold">SO-xxx</div>
            <div className="text-bone font-semibold">Today</div>
            <div className="text-bone font-semibold">line items</div>
            <div className="text-bone font-semibold">MH-12-AB-1234</div>
            <div className="text-bone font-semibold">Optional</div>
          </div>
        </div>
      </div>

      {!data ? <Spinner /> : data.items.length === 0 ? (
        <EmptyState
          title="No dispatches yet"
          message="Confirm a sales order to reserve stock, then dispatch it from here."
        />
      ) : (
        <>
          <Table headers={['Dispatch', 'Sales Order', 'Customer', 'Date', 'Products', 'Vehicle', 'Driver']}>
            {data.items.map((d) => (
              <tr key={d.id} className="hover:bg-surface-deep cursor-pointer" onClick={() => setDetail(d)}>
                <td className="px-4 py-3 font-semibold text-accent-dark">{d.dispatchNumber}</td>
                <td className="px-4 py-3 text-sm font-medium text-ink">{d.salesOrder.orderNumber}</td>
                <td className="px-4 py-3 text-sm text-ink-muted">{d.salesOrder.customer.companyName}</td>
                <td className="px-4 py-3 text-sm text-ink-soft">{formatDate(d.dispatchDate)}</td>
                <td className="px-4 py-3 text-sm text-ink-muted">
                  <span className="block max-w-[16rem] truncate">{d.items.map((i) => `${i.product.name} ×${i.qty}`).join(', ')}</span>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-ink">{d.vehicleNo}</td>
                <td className="px-4 py-3 text-sm text-ink-soft">{d.driver || '—'}</td>
              </tr>
            ))}
          </Table>
          <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}

      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title={detail?.dispatchNumber || 'Dispatch'} wide>
        {detail && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><div className="text-xs text-ink-faint">Sales Order</div><div className="font-semibold text-ink">{detail.salesOrder.orderNumber}</div></div>
              <div><div className="text-xs text-ink-faint">Customer</div><div className="text-ink-soft">{detail.salesOrder.customer.companyName}</div></div>
              <div><div className="text-xs text-ink-faint">Dispatch date</div><div className="text-ink-soft">{formatDate(detail.dispatchDate)}</div></div>
              <div><div className="text-xs text-ink-faint">Processed by</div><div className="text-ink-soft">{detail.processedBy?.name || '—'}</div></div>
              <div><div className="text-xs text-ink-faint">Vehicle number</div><div className="text-ink-soft">{detail.vehicleNo}</div></div>
              <div><div className="text-xs text-ink-faint">Driver name</div><div className="text-ink-soft">{detail.driver || '—'}</div></div>
            </div>
            <div>
              <h4 className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-bone-faint mb-2">Dispatched Products</h4>
              <Table headers={['Product', 'Code', 'Quantity', 'Unit']}>
                {detail.items.map((it) => (
                  <tr key={it.productId}>
                    <td className="px-4 py-2 text-sm font-medium text-ink">{it.product.name}</td>
                    <td className="px-4 py-2 text-sm text-ink-soft">{it.product.code}</td>
                    <td className="px-4 py-2 text-sm font-semibold text-ink">{it.qty}</td>
                    <td className="px-4 py-2 text-sm text-ink-soft">{it.product.unit}</td>
                  </tr>
                ))}
              </Table>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Dispatch" wide>
        <div className="space-y-4">
          <Field label="Confirmed Sales Order" required>
            <select className={selectCls} value={selected?.id ?? ''} onChange={(e) => setSelected(confirmed.find((so) => so.id === Number(e.target.value)) || null)}>
              <option value="">Select a confirmed sales order…</option>
              {confirmed.map((so) => (
                <option key={so.id} value={so.id}>{so.orderNumber} — {so.customer.companyName} · {formatDate(so.orderDate)}</option>
              ))}
            </select>
            {confirmed.length === 0 && <span className="mt-1 block text-xs text-bone-faint">No confirmed sales orders — confirm one (admin) in Sales Orders first.</span>}
          </Field>

          {selected && (
            <div>
              <h4 className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-bone-faint mb-2">Items — reserved quantity available for dispatch</h4>
              <Table headers={['Product', 'Order Qty', 'Physical', 'Reserved', 'Available', 'Status']}>
                {selected.items.map((it) => {
                  const inv = it.product?.inventory;
                  const reserved = reservedOf(it);
                  const avail = inv ? inv.physicalQty - inv.reservedQty : 0;
                  const ok = it.qty <= reserved;
                  return (
                    <tr key={it.productId}>
                      <td className="px-4 py-2 text-sm font-medium text-ink">{it.product.name}</td>
                      <td className="px-4 py-2 text-sm">{it.qty} {it.product.unit}</td>
                      <td className="px-4 py-2 text-sm">{inv?.physicalQty ?? '-'}</td>
                      <td className="px-4 py-2 text-sm">{reserved}</td>
                      <td className="px-4 py-2 text-sm">{avail}</td>
                      <td className="px-4 py-2 text-sm">
                        {ok ? <span className="text-xs font-semibold text-success">Dispatchable</span> : <span className="text-xs font-semibold text-error">Exceeds reserved — blocked</span>}
                      </td>
                    </tr>
                  );
                })}
              </Table>
              <p className="mt-2 text-xs text-bone-faint">On dispatch: physical −qty and reserved −qty (available unchanged).</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Vehicle Number" required>
              <input className={inputCls} value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} placeholder="MH-12-AB-1234" />
            </Field>
            <Field label="Driver Name">
              <input className={inputCls} value={driver} onChange={(e) => setDriver(e.target.value)} placeholder="Optional" />
            </Field>
          </div>

          {selected && exceedsReserved(selected) && (
            <p className="text-sm font-semibold text-error">Cannot dispatch — at least one line exceeds its reserved quantity.</p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              variant="success"
              disabled={submitting || !selected || !vehicleNo.trim() || exceedsReserved(selected)}
              onClick={doDispatch}
            >
              {submitting ? 'Dispatching…' : `Dispatch ${selected?.orderNumber || ''}`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
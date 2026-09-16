import { useCallback, useEffect, useState } from 'react';
import { quotationApi, enquiryApi, productApi } from '../api/endpoints';
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
import Timeline from '../components/shared/Timeline';
import ProductLinesEditor from '../components/forms/ProductLinesEditor';
import { Field, inputCls } from '../components/ui/Field';
import { formatDate, formatINR } from '../utils/formatters';

export default function Quotations() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [enquiries, setEnquiries] = useState([]);
  const [products, setProducts] = useState([]);
  const [detail, setDetail] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const { hasRole } = useAuth();

  const [form, setForm] = useState({
    enquiryId: '', discountPct: 0, gstPct: 18, validUntil: '',
    price: '', lines: [{ productId: '', quantity: 1, unitPrice: 0 }],
  });
  const [selectedProducts, setSelectedProducts] = useState([]);

  const load = useCallback(async () => {
    const res = await quotationApi.list({ page, limit: 10, status: status || undefined });
    setData(res.data);
  }, [page, status]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const openCreate = async () => {
    setShowCreate(true);
    const [eq, ps] = await Promise.all([enquiryApi.list({ page: 1, limit: 100 }), productApi.list()]);
    setEnquiries(eq.data.items || []);
    setProducts(ps.data);
  };

  const onEnquiryChange = (id) => {
    setForm({ ...form, enquiryId: id, lines: [] });
    const enq = enquiries.find((e) => String(e.id) === String(id));
    if (enq) {
      const items = enq.items.map((it) => ({ productId: it.productId, quantity: it.quantity, unitPrice: Number(it.product.basePrice) }));
      setSelectedProducts(enq.items.map((it) => ({ productId: it.productId, product: it.product })));
      setForm((f) => ({ ...f, enquiryId: id, lines: items }));
    } else {
      setSelectedProducts([]);
    }
  };

  const createQuote = async () => {
    const items = form.lines
      .filter((l) => l.productId && l.quantity > 0)
      .map((l) => ({ productId: Number(l.productId), qty: l.quantity, unitPrice: Number(l.unitPrice || form.price || 0) }));
    if (!form.enquiryId) return toast.error('Select an enquiry');
    if (items.length === 0) return toast.error('Add at least one line');
    if (items.some((i) => i.unitPrice <= 0)) return toast.error('Set a unit price for every line');
    setSubmitting(true);
    try {
      const res = await quotationApi.create({
        enquiryId: Number(form.enquiryId),
        items,
        discountPct: Number(form.discountPct || 0),
        gstPct: Number(form.gstPct || 18),
        validUntil: form.validUntil || undefined,
      });
      toast.success(`Quotation created · Grand total ${formatINR(res.data.grandTotal)}`);
      setShowCreate(false);
      setPage(1);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const changeStatus = (id, nextStatus) => {
    setConfirmAction({
      type: 'status', id, nextStatus,
      title: `Mark quotation ${nextStatus}?`,
      message: `The quotation will move to ${nextStatus}. This also updates its enquiry.`,
    });
  };

  const doConfirm = async () => {
    setSubmitting(true);
    try {
      const a = confirmAction;
      if (a.type === 'status') {
        await quotationApi.updateStatus(a.id, a.nextStatus);
        toast.success(`Quotation ${a.nextStatus.toLowerCase()}`);
        load();
        if (detail && (detail.id === a.id)) openDetail(a.id);
      } else if (a.type === 'convert') {
        const res = await quotationApi.convert(a.id);
        toast.success(`Sales order ${res.data.orderNumber} created`);
        load();
        openDetail(a.id);
      }
      setConfirmAction(null);
    } catch (err) { toast.error(err.message); setConfirmAction(null); }
    finally { setSubmitting(false); }
  };

  const openDetail = async (id) => {
    const res = await quotationApi.get(id);
    setDetail(res.data);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quotations</h1>
          <p className="text-sm text-slate-500">Pricing enquiries with backend-calculated totals</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="px-3 py-2 text-sm rounded-lg border border-slate-300" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            {['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <Button onClick={openCreate}>+ New Quotation</Button>
        </div>
      </div>

      {!data ? <Spinner /> : data.items.length === 0 ? <EmptyState title="No quotations yet" message="Create a quotation from an enquiry." /> : (
        <>
          <Table headers={['Number', 'Customer', 'Enquiry', 'Grand Total', 'Valid Until', 'Status', 'Actions']}>
            {data.items.map((q) => (
              <tr key={q.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => openDetail(q.id)}>
                <td className="px-4 py-3 font-semibold text-blue-700">{q.quotationNumber}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-800">{q.customer.companyName}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{q.enquiry?.enquiryNumber}</td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-800">{formatINR(q.grandTotal)}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{formatDate(q.validUntil)}</td>
                <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <a href={quotationApi.pdfUrl(q.id)} target="_blank" rel="noreferrer"><Button variant="secondary" size="sm">PDF</Button></a>
                </td>
              </tr>
            ))}
          </Table>
          <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}

      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title={`Quotation ${detail?.quotationNumber || ''}`} wide>
        {detail && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><div className="text-xs text-slate-400">Customer</div><div className="font-semibold text-slate-800">{detail.customer.companyName}</div></div>
              <div><div className="text-xs text-slate-400">Enquiry</div><div className="text-slate-700">{detail.enquiry?.enquiryNumber}</div></div>
              <div><div className="text-xs text-slate-400">Discount</div><div className="text-slate-700">{Number(detail.discountPct)}%</div></div>
              <div><div className="text-xs text-slate-400">GST</div><div className="text-slate-700">{Number(detail.gstPct)}%</div></div>
              <div><div className="text-xs text-slate-400">Grand Total</div><div className="font-bold text-emerald-700">{formatINR(detail.grandTotal)}</div></div>
              <div><div className="text-xs text-slate-400">Valid Until</div><div className="text-slate-700">{formatDate(detail.validUntil)}</div></div>
              <div><div className="text-xs text-slate-400">Status</div><StatusBadge status={detail.status} /></div>
              <div><div className="text-xs text-slate-400">Created by</div><div className="text-slate-700">{detail.createdBy?.name}</div></div>
            </div>

            <Table headers={['#', 'Product', 'Qty', 'Unit Price', 'Line Amount']}>
              {detail.items.map((it, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 text-sm text-slate-500">{i + 1}</td>
                  <td className="px-4 py-2 text-sm"><div className="font-medium text-slate-800">{it.product.name}</div><div className="text-xs text-slate-400">{it.product.code}</div></td>
                  <td className="px-4 py-2 text-sm">{it.qty} {it.product.unit}</td>
                  <td className="px-4 py-2 text-sm">{formatINR(it.unitPrice)}</td>
                  <td className="px-4 py-2 text-sm font-semibold">{formatINR(it.lineAmount)}</td>
                </tr>
              ))}
            </Table>

            <div className="flex flex-wrap gap-2 justify-between items-center">
              <div className="flex gap-2">
                {detail.status === 'DRAFT' && <Button variant="secondary" size="sm" onClick={() => changeStatus(detail.id, 'SENT')}>Send</Button>}
                {detail.status === 'SENT' && <>
                  <Button variant="success" size="sm" onClick={() => changeStatus(detail.id, 'ACCEPTED')}>Accept</Button>
                  <Button variant="danger" size="sm" onClick={() => changeStatus(detail.id, 'REJECTED')}>Reject</Button>
                </>}
                {detail.status === 'ACCEPTED' && !detail.salesOrder && (
                  <Button variant="primary" size="sm" onClick={() => setConfirmAction({ type: 'convert', id: detail.id })}>Convert to Sales Order</Button>
                )}
              </div>
              <a href={quotationApi.pdfUrl(detail.id)} target="_blank" rel="noreferrer">
                <Button variant="secondary" size="sm">Download PDF</Button>
              </a>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Activity</h4>
              <Timeline logs={detail.auditLogs} />
            </div>
          </div>
        )}
      </Modal>

      {confirmAction && (
        <ConfirmModal
          open
          onClose={() => setConfirmAction(null)}
          onConfirm={doConfirm}
          title={confirmAction.title}
          message={confirmAction.message}
          loading={submitting}
        />
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Quotation" wide>
        <div className="space-y-4">
          <Field label="Enquiry" required>
            <select className={inputCls} value={form.enquiryId} onChange={(e) => onEnquiryChange(e.target.value)}>
              <option value="">Select enquiry...</option>
              {enquiries
                .filter((e) => !e.quotation)
                .map((e) => <option key={e.id} value={e.id}>{e.enquiryNumber} · {e.customer?.companyName}</option>)}
            </select>
          </Field>
          {form.enquiryId && selectedProducts.length === 0 && <p className="text-sm text-amber-600">No products available for this enquiry.</p>}
          {selectedProducts.length > 0 && (
            <>
              <div>
                <span className="block text-sm font-medium text-slate-700 mb-1">Products — qty, edit unit price</span>
                <ProductLinesEditor
                  lines={form.lines}
                  setLines={(fn) => setForm({ ...form, lines: fn(form.lines) })}
                  products={selectedProducts}
                  enablePrice
                  qtyKey="quantity"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Discount %"><input type="number" min="0" max="100" className={inputCls} value={form.discountPct} onChange={(e) => setForm({ ...form, discountPct: e.target.value })} /></Field>
                <Field label="GST %"><input type="number" min="0" max="100" className={inputCls} value={form.gstPct} onChange={(e) => setForm({ ...form, gstPct: e.target.value })} /></Field>
              </div>
              <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-2 rounded-lg inline-block">
                Totals are calculated on the backend — client-sent totals are ignored.
              </span>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button onClick={createQuote} disabled={submitting}>{submitting ? 'Creating...' : 'Create Quotation'}</Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
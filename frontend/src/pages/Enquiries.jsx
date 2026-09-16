import { useCallback, useEffect, useState } from 'react';
import { enquiryApi, productApi, customerApi } from '../api/endpoints';
import { useToast } from '../context/ToastContext';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import SearchInput from '../components/ui/SearchInput';
import Pagination from '../components/ui/Pagination';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import StatusBadge from '../components/shared/StatusBadge';
import ProductLinesEditor from '../components/forms/ProductLinesEditor';
import { Field, inputCls } from '../components/ui/Field';
import { formatDate } from '../utils/formatters';
import useDebounce from '../hooks/useDebounce';

export default function Enquiries() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const debouncedSearch = useDebounce(search);

  const [form, setForm] = useState({
    customerId: '', companyName: '', contactPerson: '', mobile: '', email: '', city: '',
    requiredDate: '', notes: '', lines: [{ productId: '', quantity: 1 }],
  });

  const load = useCallback(async () => {
    const res = await enquiryApi.list({ page, limit: 10, search: debouncedSearch || undefined, status: status || undefined });
    setData(res.data);
  }, [page, debouncedSearch, status]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const openCreate = async () => {
    setShowCreate(true);
    const [ps, cs] = await Promise.all([productApi.list(), customerApi.list()]);
    setProducts(ps.data);
    setCustomers(cs.data);
  };

  const handleStatus = async (id, newStatus) => {
    try {
      await enquiryApi.updateStatus(id, newStatus);
      toast.success(`Enquiry marked ${newStatus}`);
      load();
    } catch (err) { toast.error(err.message); }
  };

  const submit = async () => {
    const customer = form.customerId
      ? { id: Number(form.customerId) }
      : { companyName: form.companyName, contactPerson: form.contactPerson, mobile: form.mobile, email: form.email || undefined, city: form.city || undefined };
    const items = form.lines.filter((l) => l.productId && l.quantity > 0).map((l) => ({ productId: Number(l.productId), quantity: l.quantity }));
    if (items.length === 0) return toast.error('Add at least one product line');
    if (!customer.id && !customer.companyName) return toast.error('Select a customer or fill company details');
    setSubmitting(true);
    try {
      await enquiryApi.create({ customer, items, requiredDate: form.requiredDate || undefined, notes: form.notes || undefined });
      toast.success('Enquiry created');
      setShowCreate(false);
      setPage(1);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Enquiries</h1>
          <p className="text-sm text-slate-500">Customer enquiries with product demand</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-56"><SearchInput value={search} onChange={setSearch} placeholder="Search enquiry / customer..." /></div>
          <select className="px-3 py-2 text-sm rounded-lg border border-slate-300" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            {['NEW', 'QUOTED', 'WON', 'LOST'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <Button onClick={openCreate}>+ New Enquiry</Button>
        </div>
      </div>

      {!data ? <Spinner /> : data.items.length === 0 ? <EmptyState title="No enquiries found" message="Create your first customer enquiry." /> : (
        <>
          <Table headers={['Number', 'Customer', 'Date', 'Required By', 'Products', 'Status', 'Actions']}>
            {data.items.map((en) => (
              <tr key={en.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-blue-700">{en.enquiryNumber}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">{en.customer.companyName}</div>
                  <div className="text-xs text-slate-400">{en.customer.city || '-'}</div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{formatDate(en.enquiryDate)}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{formatDate(en.requiredDate)}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{en.items.length} product{en.items.length > 1 ? 's' : ''}</td>
                <td className="px-4 py-3"><StatusBadge status={en.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 items-center">
                    {en.status === 'NEW' && <Button variant="ghost" size="sm" onClick={() => handleStatus(en.id, 'LOST')}>Mark Lost</Button>}
                    {en.quotation && <span className="text-xs text-slate-400">Quoted</span>}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
          <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Enquiry" wide>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Existing customer">
              <select className={inputCls} value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                <option value="">Select existing...</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
              </select>
            </Field>
            <div className="text-xs text-slate-400 self-end pb-2">— or fill new customer below —</div>
            <Field label="Company name"><input className={inputCls} value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></Field>
            <Field label="Contact person"><input className={inputCls} value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></Field>
            <Field label="Mobile"><input className={inputCls} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></Field>
            <Field label="Email"><input className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="City"><input className={inputCls} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
          </div>
          <Field label="Required by"><input type="date" className={inputCls} value={form.requiredDate} onChange={(e) => setForm({ ...form, requiredDate: e.target.value })} /></Field>
          <div>
            <span className="block text-sm font-medium text-slate-700 mb-1">Products</span>
            <ProductLinesEditor lines={form.lines} setLines={(fn) => setForm({ ...form, lines: fn(form.lines) })} products={products} enablePrice={false} qtyKey="quantity" />
          </div>
          <Field label="Notes"><textarea rows={2} className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={submit} disabled={submitting}>{submitting ? 'Creating...' : 'Create Enquiry'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
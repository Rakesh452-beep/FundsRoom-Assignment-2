import { useCallback, useEffect, useState } from 'react';
import { customerApi } from '../api/endpoints';
import { useToast } from '../context/ToastContext';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { Field, inputCls } from '../components/ui/Field';

export default function Customers() {
  const [data, setData] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ companyName: '', contactPerson: '', mobile: '', email: '', city: '' });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    const res = await customerApi.list();
    setData(res.data);
  }, []);
  useEffect(() => { load().catch(() => {}); }, [load]);

  const submit = async () => {
    setSubmitting(true);
    try {
      await customerApi.create({ ...form, email: form.email || undefined, city: form.city || undefined });
      toast.success('Customer created');
      setShowCreate(false);
      setForm({ companyName: '', contactPerson: '', mobile: '', email: '', city: '' });
      load();
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
          <p className="text-sm text-slate-500">Customer master records</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ New Customer</Button>
      </div>

      {!data ? <Spinner /> : data.length === 0 ? <EmptyState title="No customers" /> : (
        <Table headers={['Company', 'Contact', 'Mobile', 'Email', 'City', 'Added by']}>
          {data.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-800">{c.companyName}</td>
              <td className="px-4 py-3 text-sm text-slate-600">{c.contactPerson}</td>
              <td className="px-4 py-3 text-sm text-slate-600">{c.mobile}</td>
              <td className="px-4 py-3 text-sm text-slate-500">{c.email || '-'}</td>
              <td className="px-4 py-3 text-sm text-slate-600">{c.city || '-'}</td>
              <td className="px-4 py-3 text-sm text-slate-500">{c.createdBy?.name}</td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Customer">
        <div className="space-y-4">
          <Field label="Company name" required><input className={inputCls} value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></Field>
          <Field label="Contact person" required><input className={inputCls} value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></Field>
          <Field label="Mobile" required><input className={inputCls} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></Field>
          <Field label="Email"><input className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="City"><input className={inputCls} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={submit} disabled={submitting}>{submitting ? 'Saving...' : 'Save Customer'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
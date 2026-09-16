import Modal from './Modal';
import Button from './Button';

export default function ConfirmModal({ open, onClose, onConfirm, title, message, loading, confirmLabel = 'Confirm' }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-slate-600">{message}</p>
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm} disabled={loading}>{loading ? 'Processing...' : confirmLabel}</Button>
      </div>
    </Modal>
  );
}
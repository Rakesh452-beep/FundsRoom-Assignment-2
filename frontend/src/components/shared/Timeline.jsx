import { formatDateTime } from '../../utils/formatters';
import Badge from '../ui/Badge';

const actionColors = {
  CREATE: 'bg-accent',
  STATUS_CHANGE: 'bg-amber-500',
  CONVERT: 'bg-indigo-500',
  CONFIRM: 'bg-emerald-500',
  DISPATCH: 'bg-purple-500',
  REJECTED: 'bg-rose-500',
  INVENTORY_ADJUST: 'bg-teal-500',
  CANCEL: 'bg-rose-500',
};

export default function Timeline({ logs }) {
  if (!logs || logs.length === 0) return <p className="text-sm text-bone-faint py-4">No activity recorded yet.</p>;
  return (
    <ol className="relative border-l-2 border-line ml-2 space-y-4 py-1">
      {logs.map((log) => (
        <li key={log.id} className="ml-4">
          <span className={`absolute -left-1 mt-1 w-3 h-3 rounded-full ring-4 ring-white ${actionColors[log.action] || 'bg-ink-muted'}`} />
          <div className="text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-bone">{log.actor?.name || 'System'}</span>
              <span className="text-bone-faint">·</span>
              <span className="text-xs uppercase tracking-wide text-bone-muted">{log.action}</span>
              <span className="text-bone-faint">·</span>
              <span className="text-xs text-bone-faint">{formatDateTime(log.createdAt)}</span>
            </div>
            {log.before?.status && log.after?.status && (
              <div className="mt-1 flex items-center gap-2">
                <Badge status={log.before.status} />
                <span className="text-bone-faint">→</span>
                <Badge status={log.after.status} />
              </div>
            )}
            {log.after?.dispatchNumber && <p className="mt-1 text-xs text-bone-muted">Dispatch: {log.after.dispatchNumber}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
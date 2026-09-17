export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 font-mono text-sm">
      <span className="text-bone-faint">Page {page} of {totalPages}</span>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="px-3.5 py-1.5 rounded-xl border border-line bg-white text-bone-soft font-bold disabled:opacity-40 hover:border-accent/40 disabled:hover:border-line disabled:hover:text-bone-soft transition-colors"
        >
          Prev
        </button>
        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="px-3.5 py-1.5 rounded-xl border border-line bg-white text-bone-soft font-bold disabled:opacity-40 hover:border-accent/40 disabled:hover:border-line disabled:hover:text-bone-soft transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
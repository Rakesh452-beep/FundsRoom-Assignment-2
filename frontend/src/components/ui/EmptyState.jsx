export default function EmptyState({ title = 'No records found', message }) {
  return (
    <div className="text-center py-16">
      <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-700">{title}</h3>
      {message && <p className="mt-1 text-sm text-slate-500">{message}</p>}
    </div>
  );
}
export default function Table({ headers, children }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="min-w-full divide-y divide-line">
        <thead className="bg-night">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 text-left font-mono text-xs font-bold uppercase tracking-[0.12em] text-bone-faint">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}
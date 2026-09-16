import Button from '../ui/Button';

export default function ProductLinesEditor({ lines, setLines, products, enablePrice = true, qtyKey = 'quantity' }) {
  const update = (idx, key, value) => setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, [key]: value } : l)));
  const addLine = () => setLines((ls) => [...ls, { productId: '', ...(enablePrice ? { unitPrice: 0 } : {}), [qtyKey]: 1 }]);
  const removeLine = (idx) => setLines((ls) => ls.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      {lines.map((line, idx) => (
        <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
          <select
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={line.productId}
            onChange={(e) => update(idx, 'productId', Number(e.target.value))}
          >
            <option value="">Select product...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            className="w-24 px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={line[qtyKey]}
            onChange={(e) => update(idx, qtyKey, Number(e.target.value))}
            placeholder="Qty"
          />
          {enablePrice && (
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-28 px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={line.unitPrice}
              onChange={(e) => update(idx, 'unitPrice', Number(e.target.value))}
              placeholder="Price"
            />
          )}
          <Button variant="ghost" size="sm" onClick={() => removeLine(idx)}>✕</Button>
        </div>
      ))}
      <Button variant="secondary" size="sm" onClick={addLine}>+ Add line</Button>
    </div>
  );
}
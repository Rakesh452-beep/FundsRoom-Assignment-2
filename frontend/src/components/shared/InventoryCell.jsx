export default function InventoryCell({ product }) {
  const inventory = product?.inventory;
  if (!inventory) return <span className="text-xs text-bone-faint">No stock</span>;
  const available = inventory.physicalQty - inventory.reservedQty;
  const low = available <= 50;
  return (
    <div className="text-xs">
      <div className="flex gap-3">
        <span><span className="text-bone-faint">Phys:</span> <b className="text-bone">{inventory.physicalQty}</b></span>
        <span><span className="text-bone-faint">Res:</span> <b className="text-bone">{inventory.reservedQty}</b></span>
        <span className={low ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-semibold'}>
          Avail: {available}
        </span>
      </div>
    </div>
  );
}
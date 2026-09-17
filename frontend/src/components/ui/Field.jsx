export function Field({ label, required, children, hint }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block font-mono text-[0.62rem] uppercase tracking-[0.16em] text-bone-faint">{label}{required && <span className="text-accent"> *</span>}</span>}
      {children}
      {hint && <span className="mt-1 block text-xs text-bone-faint">{hint}</span>}
    </label>
  );
}

export const inputCls = "w-full px-3.5 py-2.5 text-sm rounded-xl bg-white border border-line text-bone placeholder:text-bone-faint focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent/50 transition";

export const selectCls = "px-3.5 py-2.5 text-sm rounded-xl bg-white border border-line text-bone focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent/50 transition";
export default function Button({ variant = 'primary', size = 'md', className = '', children, ...props }) {
  const variants = {
    primary: 'bg-accent text-white hover:bg-accent-dark focus:ring-accent/30 shadow-card',
    secondary: 'bg-white text-bone border border-line hover:border-accent/40 hover:text-accent-dark focus:ring-line',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-400/40',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-400/40',
    ghost: 'text-bone-muted hover:bg-night-raise hover:text-bone focus:ring-line',
  };
  const sizes = {
    sm: 'px-3.5 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
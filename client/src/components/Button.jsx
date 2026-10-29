import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary:
    'bg-[#0176d3] text-white hover:bg-[#0b5cab] border-2 border-[#0176d3] font-bold rounded-sm shadow-none',
  secondary:
    'bg-white text-[#0176d3] hover:bg-slate-50 border-2 border-[#0176d3] font-bold rounded-sm shadow-none',
  danger:
    'bg-white text-[#ba0517] hover:bg-red-50 border-2 border-[#ba0517] font-bold rounded-sm shadow-none',
  ghost:
    'bg-transparent text-slate-700 border border-transparent hover:bg-slate-100 hover:text-slate-900 rounded-sm font-medium',
  link:
    'bg-transparent text-[#0b5cab] border-0 p-0 hover:underline shadow-none font-normal',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon: Icon,
  children,
  className = '',
  disabled,
  ...rest
}) {
  const sizing =
    size === 'sm'
      ? 'px-3 py-1 text-xs gap-1.5 min-h-[32px]'
      : size === 'lg'
        ? 'px-8 py-3 text-base gap-2 min-h-[52px]'
        : 'px-4 py-1.5 text-sm gap-2 min-h-[38px]';

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${sizing} ${VARIANTS[variant] || VARIANTS.secondary} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
      {children}
    </button>
  );
}

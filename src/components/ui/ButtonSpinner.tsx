/** Inline indeterminate spinner for buttons while a mutation is in flight. */
export function ButtonSpinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-white border-t-brand-blue align-[-2px] ${className}`}
      aria-hidden
    />
  );
}

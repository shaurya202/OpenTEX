export function BrandMark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <rect width="64" height="64" rx="14" className="fill-[#1D1D1F] dark:fill-[#2C2C2E]" />
      <path d="M16 17L27 47" stroke="#2997FF" strokeWidth="6.5" strokeLinecap="round" />
      <path d="M31 19H50M40.5 19V47" stroke="#FFFFFF" strokeWidth="6.5" strokeLinecap="round" />
    </svg>
  );
}

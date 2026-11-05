export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <path
        d="M5 12.5c3.2 3.6 6.6 3.6 11 0s7.8-3.6 11 0M5 20c3.2 3.6 6.6 3.6 11 0s7.8-3.6 11 0"
        stroke="currentColor"
        strokeWidth="3.6"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

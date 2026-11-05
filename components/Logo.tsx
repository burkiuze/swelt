/* eslint-disable @next/next/no-img-element */
export function Logo({ size = 26, keepWhite = false }: { size?: number; keepWhite?: boolean }) {
  return <img src="/brand/swelt-white.png" alt="" width={size} height={size} className={`shrink-0 ${keepWhite ? "keep-white" : ""}`} />;
}

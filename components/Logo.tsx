/* eslint-disable @next/next/no-img-element */
export function Logo({ size = 26 }: { size?: number }) {
  return <img src="/brand/swelt-white.png" alt="" width={size} height={size} className="shrink-0" />;
}

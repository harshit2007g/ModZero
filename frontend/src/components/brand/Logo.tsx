import { useId } from "react";

/**
 * The ModZero mark: a zero with a fingerprint inside it.
 *
 * The ring is the "zero" — no moderator, nothing in the middle deciding things.
 * The nested arcs are the perceptual fingerprint the protocol actually takes at
 * upload. Two ideas the product is built on, in one glyph.
 *
 * Gradient ids are generated per instance so multiple logos on a page (header,
 * footer, 404) don't collide.
 */
export function Logo({ size = 34, className = "" }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const grad = `mz-grad-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      role="img"
      aria-label="ModZero"
    >
      <defs>
        <linearGradient id={grad} x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5b53ff" />
          <stop offset="0.55" stopColor="#00b0d8" />
          <stop offset="1" stopColor="#ff4f8b" />
        </linearGradient>
      </defs>

      {/* the zero */}
      <circle cx="20" cy="20" r="16.2" stroke={`url(#${grad})`} strokeWidth="3.6" />

      {/* fingerprint ridges, opening left */}
      <path
        d="M20 8.6a11.4 11.4 0 0 0 0 22.8"
        stroke={`url(#${grad})`}
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M20 13.2a6.8 6.8 0 0 0 0 13.6"
        stroke={`url(#${grad})`}
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx="20.4" cy="20" r="2.1" fill={`url(#${grad})`} />
    </svg>
  );
}

/** Mark plus wordmark, as used in the header and footer. */
export function Wordmark({ size = 34, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Logo size={size} />
      <span className="text-[22px] font-bold tracking-tight text-navy">
        Mod<span className="grad-text">Zero</span>
      </span>
    </span>
  );
}

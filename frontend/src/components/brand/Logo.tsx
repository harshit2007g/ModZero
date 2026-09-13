import { useId } from "react";

/**
 * The ModZero mark: a faceted "M" gem set inside a hexagon cut, with a
 * small inlaid ring at its base standing in for the "Zero" — the mark
 * jewelers use, not a moderator's stamp.
 *
 * Facets stay in one violet family (a single stone, not a rainbow); the
 * brand gradient is reserved for the hexagon rim and the zero jewel, so it
 * reads as an accent rather than a pattern.
 *
 * Gradient ids are generated per instance so multiple logos on a page
 * (header, footer, 404) don't collide.
 */
export function Logo({ size = 34, className = "" }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const grad = `mz-grad-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      fill="none"
      className={className}
      role="img"
      aria-label="ModZero"
    >
      <defs>
        <linearGradient id={grad} x1="9" y1="9" x2="63" y2="63" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5b53ff" />
          <stop offset="0.55" stopColor="#00b0d8" />
          <stop offset="1" stopColor="#ff4f8b" />
        </linearGradient>
      </defs>

      {/* hexagon gem cut */}
      <polygon
        points="36,7 60,20 60,49 36,63 12,49 12,20"
        fill="none"
        stroke={`url(#${grad})`}
        strokeWidth="1.6"
      />

      {/* faceted M — one violet family, dark to light, for a cut-stone look */}
      <polygon points="18,46 18,22 27,22 27,36" fill="#2c2870" />
      <polygon points="27,22 36,39 27,36" fill="#4740a8" />
      <polygon points="36,39 45,22 36,36" fill="#7b74e0" />
      <polygon points="45,22 54,22 54,46 45,36" fill="#2c2870" />
      <polygon points="27,36 36,39 36,36" fill="#e4e2ff" />

      {/* the zero, set like a jewel at the mark's base */}
      <circle cx="36" cy="46" r="4.4" fill="var(--color-card)" stroke={`url(#${grad})`} strokeWidth="2" />
      <circle cx="36" cy="46" r="1.1" fill={`url(#${grad})`} />
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

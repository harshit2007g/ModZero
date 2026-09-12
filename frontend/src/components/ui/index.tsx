import type { ButtonHTMLAttributes, ReactNode } from "react";

/* Type floor is 16px. Body is 20px. Nothing smaller than 16 ships. */

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-45";
  const sizes = {
    sm: "px-5 py-2.5 text-[17px]",
    md: "px-7 py-3.5 text-[18px]",
    lg: "px-9 py-4.5 text-[20px]",
  };
  const variants = {
    primary:
      "bg-brand text-white shadow-[0_10px_30px_-10px_rgba(91,83,255,0.9)] hover:bg-[#4a42f0] hover:-translate-y-0.5 hover:shadow-[0_16px_38px_-12px_rgba(91,83,255,0.95)]",
    outline: "border-2 border-line bg-card text-navy hover:border-brand hover:text-brand",
    ghost: "text-slate hover:text-navy",
    danger: "bg-flag text-white hover:brightness-110 hover:-translate-y-0.5",
  };
  return <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />;
}

export function Card({
  children,
  className = "",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return <div className={`card ${hover ? "card-hover" : ""} ${className}`}>{children}</div>;
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "mint" | "flag" | "sun" | "sky";
}) {
  const tones = {
    neutral: "bg-[#efedfa] text-slate",
    brand: "bg-brand-soft text-brand",
    mint: "bg-[#e2f6f0] text-mint",
    flag: "bg-[#fdeaec] text-flag",
    sun: "bg-[#fdf1de] text-sun",
    sky: "bg-[#e0f4fa] text-[#0784a3]",
  };
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[16px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Avatar({ seed, size = 54 }: { seed: string; size?: number }) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full font-bold text-white shadow-[0_6px_16px_-8px_rgba(18,16,58,0.6)]"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `linear-gradient(135deg, hsl(${hue} 78% 62%), hsl(${(hue + 52) % 360} 74% 46%))`,
      }}
    >
      {seed.replace(/^0x/, "").charAt(0).toUpperCase()}
    </span>
  );
}

export const inputClass =
  "w-full rounded-2xl border-2 border-line bg-card px-5 py-4 text-[20px] leading-relaxed text-navy outline-none transition-colors placeholder:text-muted focus:border-brand";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-3 block text-[19px] font-semibold text-navy">{label}</span>
      {children}
    </label>
  );
}

export function Row({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1 border-b border-line py-4 last:border-0 sm:flex-row sm:items-baseline sm:gap-8">
      <dt className="w-56 shrink-0 text-[17px] text-muted">{label}</dt>
      <dd className={`min-w-0 break-all text-[18px] text-navy ${mono ? "font-mono text-[16px]" : ""}`}>
        {value ?? "—"}
      </dd>
    </div>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-4 py-16 text-[19px] text-muted">
      <span className="h-3.5 w-3.5 animate-pulse rounded-full bg-brand" />
      {label}…
    </div>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="rounded-2xl border-2 border-[#f5c3c7] bg-[#fdeaec] px-6 py-5 text-[18px] text-[#a1222b]">
      {message}
    </div>
  );
}

export function truncateAddress(address?: string | null, size = 6) {
  if (!address) return "—";
  if (!address.startsWith("0x") || address.length <= size * 2) return address;
  return `${address.slice(0, size)}…${address.slice(-4)}`;
}

export function timeAgo(iso?: string | number | null) {
  if (iso === null || iso === undefined) return "—";
  const then = typeof iso === "number" ? iso * 1000 : new Date(iso).getTime();
  if (Number.isNaN(then)) return String(iso);
  const s = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(s);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (abs < 60) return rtf.format(s, "second");
  if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(s / 3600), "hour");
  if (abs < 2592000) return rtf.format(Math.round(s / 86400), "day");
  return rtf.format(Math.round(s / 2592000), "month");
}

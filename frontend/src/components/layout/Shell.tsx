import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, useScroll, useSpring } from "framer-motion";
import { useAccount, useConnect, useDisconnect, useEnsName } from "wagmi";
import { mainnet } from "wagmi/chains";
import Lenis from "lenis";
import { Avatar, Button, truncateAddress } from "../ui";
import { isOffline, onOfflineChange } from "../../lib/client";

export function useIdentity() {
  const { address, isConnected } = useAccount();
  const { data: ensName } = useEnsName({ address, chainId: mainnet.id });
  return { address, ensName: ensName ?? null, isConnected };
}

/**
 * Interpolated scrolling. This is the one thing carried over from the
 * reference: the wheel eases into position instead of jumping, which is most of
 * what makes a page feel expensive. Disabled under prefers-reduced-motion.
 */
let lenisInstance: Lenis | null = null;

/** Scrolls to an element id, accounting for the sticky header. */
export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const target = el.getBoundingClientRect().top + window.scrollY - 96;
  const from = window.scrollY;

  if (lenisInstance) {
    lenisInstance.scrollTo(target, { duration: 1.1 });
    // Lenis animates on requestAnimationFrame. If those are throttled (a
    // background tab, a reduced-motion switch mid-session, a failed init) the
    // click would do nothing at all, so fall back to a plain jump.
    window.setTimeout(() => {
      if (Math.abs(window.scrollY - from) < 4) window.scrollTo({ top: target });
    }, 450);
    return;
  }
  window.scrollTo({ top: target, behavior: "smooth" });
}

function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 0.9,
    });
    lenisInstance = lenis;
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      lenisInstance = null;
    };
  }, []);
}

function Wallet() {
  const { address, ensName, isConnected } = useIdentity();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const [hasProvider, setHasProvider] = useState(true);

  // `injected()` is always in the connectors list even with no wallet installed,
  // so clicking would fail silently. Check for a real provider instead.
  useEffect(() => {
    setHasProvider(typeof window !== "undefined" && "ethereum" in window);
  }, []);

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <Avatar seed={ensName ?? address} size={38} />
        <span className="hidden text-[17px] font-semibold text-navy sm:block">
          {ensName ?? truncateAddress(address)}
        </span>
        <Button variant="ghost" size="sm" onClick={() => disconnect()}>
          Sign out
        </Button>
      </div>
    );
  }

  if (!hasProvider) {
    return (
      <a
        href="https://metamask.io/download/"
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-2 rounded-full border-2 border-line bg-card px-5 py-2.5 text-[17px] font-semibold text-navy transition-colors hover:border-brand hover:text-brand"
        title="No browser wallet detected"
      >
        Install a wallet
      </a>
    );
  }

  const connector = connectors[0];

  return (
    <div className="relative">
      <Button
        size="sm"
        onClick={() => connector && connect({ connector })}
        disabled={!connector || isPending}
      >
        {isPending ? "Check your wallet…" : "Connect wallet"}
      </Button>
      {error && (
        <p
          role="alert"
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-[#f3c3c7] bg-[#fdeaec] px-4 py-3 text-[15px] leading-snug text-[#a1222b] shadow-lg"
        >
          {error.name === "UserRejectedRequestError"
            ? "Connection rejected in your wallet."
            : error.message}
        </p>
      )}
    </div>
  );
}

function NavItem({ to, label, end }: { to: string; label: string; end?: boolean }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const className =
    "rounded-full px-4 py-2 text-[17px] font-medium text-slate transition-colors hover:bg-band hover:text-navy";

  if (!to.includes("#")) {
    return (
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          `rounded-full px-4 py-2 text-[17px] font-medium transition-colors ${
            isActive ? "bg-band text-navy" : "text-slate hover:text-navy"
          }`
        }
      >
        {label}
      </NavLink>
    );
  }

  // "/#feed" — go to the route first if we are elsewhere, then scroll.
  const [path, hash] = to.split("#");
  const target = path || "/";
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (pathname !== target) {
          navigate(target);
          window.setTimeout(() => scrollToId(hash), 120);
        } else {
          scrollToId(hash);
        }
      }}
    >
      {label}
    </button>
  );
}

const NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/#feed", label: "Feed" },
  { to: "/verify", label: "Verify" },
  { to: "/studio", label: "Studio" },
];

export default function Shell() {
  const { pathname } = useLocation();
  const [offline, setOffline] = useState(isOffline());
  useSmoothScroll();

  useEffect(() => onOfflineChange(setOffline), []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  const { scrollYProgress } = useScroll();
  const bar = useSpring(scrollYProgress, { stiffness: 130, damping: 30, mass: 0.3 });

  return (
    <div className="min-h-screen">
      <motion.div
        aria-hidden
        style={{ scaleX: bar }}
        className="fixed inset-x-0 top-0 z-50 h-[2px] origin-left bg-brand"
      />

      <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center gap-8 px-8 py-5">
          <Link to="/" className="flex items-center gap-3">
            <span
              className="h-8 w-8 rounded-xl"
              style={{ background: "linear-gradient(135deg,#635bff,#00b8e0)" }}
            />
            <span className="text-[22px] font-bold tracking-tight text-navy">ModZero</span>
          </Link>

          <nav className="ml-4 hidden items-center gap-2 md:flex">
            {NAV.map((item) => (
              <NavItem key={item.to} to={item.to} label={item.label} end={item.end} />
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-4">
            {offline && (
              <span
                className="hidden items-center gap-2 text-[15px] text-muted lg:flex"
                title="The backend is not running, so sample data is being shown"
              >
                <span className="h-2 w-2 rounded-full bg-sun" />
                Sample data
              </span>
            )}
            <Link to="/compose" className="hidden sm:block">
              <Button size="sm">New post</Button>
            </Link>
            <Wallet />
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="mt-32 border-t border-line bg-band">
        <div className="mx-auto max-w-[1440px] px-8 py-16">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3">
                <span
                  className="h-9 w-9 rounded-xl"
                  style={{ background: "linear-gradient(135deg,#5b53ff,#00b0d8)" }}
                />
                <span className="text-[21px] font-bold tracking-tight text-navy">ModZero</span>
              </div>
              <p className="mt-5 max-w-xs text-[17px] leading-relaxed text-slate">
                Content provenance and licensing. Authorship is proven at upload rather than
                argued about afterwards.
              </p>
            </div>

            <nav aria-label="Product">
              <h2 className="text-[17px] font-bold text-navy">Product</h2>
              <ul className="mt-5 space-y-3 text-[17px] text-slate">
                <li><Link to="/" className="transition-colors hover:text-brand">Feed</Link></li>
                <li><Link to="/compose" className="transition-colors hover:text-brand">Publish a work</Link></li>
                <li><Link to="/verify" className="transition-colors hover:text-brand">Check an image</Link></li>
                <li><Link to="/studio" className="transition-colors hover:text-brand">Your studio</Link></li>
              </ul>
            </nav>

            <nav aria-label="Protocol">
              <h2 className="text-[17px] font-bold text-navy">Protocol</h2>
              <ul className="mt-5 space-y-3 text-[17px] text-slate">
                <li>ENS — identity</li>
                <li>Hedera Consensus Service — ordering</li>
                <li>Ethereum — staking and claims</li>
                <li>x402 — machine payments</li>
              </ul>
            </nav>

            <div>
              <h2 className="text-[17px] font-bold text-navy">Registries</h2>
              <ul className="mt-5 space-y-3 text-[17px] text-slate">
                <li>ContentRegistry</li>
                <li>PostRegistry</li>
                <li>LicenseRegistry</li>
                <li>ChallengeRegistry</li>
              </ul>
            </div>
          </div>

          <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-8">
            <p className="text-[17px] text-muted">No moderator. Just proof.</p>
            <p className="max-w-lg text-[16px] leading-relaxed text-muted">
              A watermark is evidence of provenance, not a determination of legal copyright
              ownership.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

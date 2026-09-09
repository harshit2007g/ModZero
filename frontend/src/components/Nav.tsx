import { Link } from "react-router-dom";
import { useAccount, useConnect, useDisconnect } from "wagmi";

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function Nav() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <header className="border-b hairline">
      <div className="mx-auto max-w-4xl flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="text-lg font-semibold tracking-tight">ModZero</span>
          <span className="hidden sm:inline text-xs text-paper-dim font-mono">no moderator. just proof.</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link to="/upload" className="text-paper-dim hover:text-paper transition-colors">
            Publish
          </Link>
          <Link to="/feed" className="text-paper-dim hover:text-paper transition-colors">
            Feed
          </Link>
          <Link to="/dashboard" className="text-paper-dim hover:text-paper transition-colors">
            Dashboard
          </Link>
          {isConnected && address ? (
            <button
              onClick={() => disconnect()}
              className="glow-btn font-mono text-xs px-3 py-1.5 rounded-full glass hover:border-gold/50 transition-colors"
            >
              {truncateAddress(address)}
            </button>
          ) : (
            <button
              onClick={() => connect({ connector: connectors[0] })}
              className="glow-btn text-xs px-3 py-1.5 rounded-full bg-gold text-ink-950 font-medium hover:bg-gold-bright transition-colors"
            >
              Connect wallet
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
import { useQuery } from "@tanstack/react-query";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4000";

/**
 * Resolves just the on-chain ModZero username for an address, or null.
 * Used wherever the UI needs to know whether a username exists specifically
 * (e.g. the registration prompt) rather than a full display name.
 */
export async function fetchUsername(address: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/username/lookup?address=${address}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.username ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolves a display name for an address, priority order:
 * on-chain ModZero username > ENS name > null.
 */
export async function fetchDisplayName(address: string): Promise<string | null> {
  try {
    const usernameRes = await fetch(`${API_BASE}/username/lookup?address=${address}`);
    if (usernameRes.ok) {
      const data = await usernameRes.json();
      if (data.username) return `${data.username}.modzero`;
    }
  } catch {
    // fall through to ENS attempt
  }

  try {
    const ensRes = await fetch(`${API_BASE}/ens/lookup?address=${address}`);
    if (ensRes.ok) {
      const data = await ensRes.json();
      if (data.name) return data.name;
    }
  } catch {
    // fall through to null
  }

  return null;
}

/**
 * Drop-in hook for showing a wallet address as a friendly name anywhere
 * in the app. React Query handles caching + deduplication automatically
 * — if 10 posts on screen are all by the same creator, this fires ONE
 * network request, not 10, and every component sharing that address
 * re-renders together once it resolves.
 *
 * Usage: const name = useDisplayName(address) ?? truncateAddress(address);
 */
export function useDisplayName(address: string): string | null {
  const { data } = useQuery({
    queryKey: ["displayName", address.toLowerCase()],
    queryFn: () => fetchDisplayName(address),
    staleTime: Infinity, // names don't change mid-session; no need to refetch
    enabled: !!address,
  });

  return data ?? null;
}

/**
 * Same caching strategy as useDisplayName, but returns the raw on-chain
 * ModZero username (no ENS fallback). Reused by Profile so the registration
 * prompt knows whether this address already owns a username.
 */
export function useModZeroName(address: string): string | null {
  const { data } = useQuery({
    queryKey: ["username", address.toLowerCase()],
    queryFn: () => fetchUsername(address),
    staleTime: Infinity,
    enabled: !!address,
  });

  return data ?? null;
}
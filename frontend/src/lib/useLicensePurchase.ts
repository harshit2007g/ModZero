/**
 * Wallet-native licence purchase.
 *
 * Drives the whole x402-style flow without ever asking the user to copy a
 * transaction hash:
 *
 *   step 1  requestLicense (no hash)          → backend 402 (quote)
 *   wallet  switchChain to Sepolia if needed  → MetaMask popup
 *   pay     sendTransaction from user's wallet → tx hash captured, not pasted
 *   confirm waitForTransactionReceipt         → mined
 *   step 2  requestLicense (with hash)        → backend verifies on-chain → issues
 *
 * The backend stays the authority: it re-verifies the payment on-chain before
 * minting, and it is idempotent, so a retry/refresh returns the same licence
 * instead of charging twice. If the page reloads with a payment already sent,
 * start() resumes from the stored pending tx and finishes verification.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { sepolia } from "wagmi/chains";
import { UserRejectedRequestError } from "viem";
import { requestLicense } from "./client";
import type { LicenseRecord, PaymentRequiredResponse } from "./api";

export type PurchaseStatus =
  | "idle"
  | "no-wallet"
  | "switching-network"
  | "preparing"
  | "awaiting-approval"
  | "submitted"
  | "confirming"
  | "verifying"
  | "verification-failed"
  | "issued"
  | "cancelled"
  | "failed";

export const LICENSE_STATUS_COPY: Record<PurchaseStatus, string> = {
  idle: "",
  "no-wallet": "Connect a wallet to pay for the licence.",
  "switching-network": "Switching your wallet to Sepolia…",
  preparing: "Asking the creator's agent for a price…",
  "awaiting-approval": "Approve the payment in your wallet.",
  submitted: "Payment sent — waiting for the network…",
  confirming: "Confirming the transaction…",
  verifying: "Verifying the payment on-chain…",
  issued: "Licence issued on-chain for this work.",
  cancelled: "Payment was cancelled in your wallet.",
  failed: "Something went wrong — you can try again.",
  "verification-failed": "The payment could not be verified yet.",
};

const ACTIVE_STATUSES: PurchaseStatus[] = [
  "switching-network",
  "preparing",
  "awaiting-approval",
  "submitted",
  "confirming",
  "verifying",
];

const RESUME_KEY = "modzero:pendingLicensePayment";

interface PendingPayment {
  contentId: string;
  paymentTxHash: string;
}

function readPending(): PendingPayment | null {
  try {
    const raw = window.sessionStorage.getItem(RESUME_KEY);
    return raw ? (JSON.parse(raw) as PendingPayment) : null;
  } catch {
    return null;
  }
}

function writePending(pending: PendingPayment) {
  try {
    window.sessionStorage.setItem(RESUME_KEY, JSON.stringify(pending));
  } catch {
    /* sessionStorage unavailable — resume is a nicety, not a requirement */
  }
}

function clearPending() {
  try {
    window.sessionStorage.removeItem(RESUME_KEY);
  } catch {
    /* ignore */
  }
}

export class PurchaseError extends Error {
  readonly status: Exclude<PurchaseStatus, "issued">;

  constructor(status: Exclude<PurchaseStatus, "issued">, message?: string) {
    super(message ?? `purchase ${status}`);
    this.name = "PurchaseError";
    this.status = status;
  }
}

function isUserRejected(e: unknown): boolean {
  return (
    e instanceof UserRejectedRequestError ||
    (typeof e === "object" && e !== null && (e as { code?: number }).code === 4001)
  );
}

export interface UseLicensePurchaseOptions {
  contentId: string;
  usage: "commercial" | "nonCommercial";
  intendsModification: boolean;
  intendsPoliticalUse: boolean;
}

/**
 * Step 2: hand the paymentTxHash to the backend. It re-verifies on-chain and
 * issues. The backend's own RPC can lag the wallet's by a few seconds, so
 * retry briefly before declaring verification-failed.
 */
async function submitPayment(
  paymentTxHash: string,
  requester: string,
  opts: UseLicensePurchaseOptions
): Promise<LicenseRecord> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const result = await requestLicense({
      contentId: opts.contentId,
      requester,
      usage: opts.usage,
      intendsModification: opts.intendsModification,
      intendsPoliticalUse: opts.intendsPoliticalUse,
      paymentTxHash,
    });
    if (result.status === "issued") return result.license;
    await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
  }
  throw new PurchaseError("verification-failed");
}

export function useLicensePurchase(opts: UseLicensePurchaseOptions) {
  const { contentId, usage, intendsModification, intendsPoliticalUse } = opts;
  const { address, isConnected, chainId } = useAccount();
  const walletClient = useWalletClient().data;
  const publicClient = usePublicClient({ chainId: sepolia.id });
  const { switchChainAsync } = useSwitchChain();

  const [status, setStatus] = useState<PurchaseStatus>("idle");
  const [payment, setPayment] = useState<PaymentRequiredResponse | null>(null);
  const [license, setLicense] = useState<LicenseRecord | null>(null);
  const [error, setError] = useState("");
  const running = useRef(false);

  const busy = useMemo(() => ACTIVE_STATUSES.includes(status), [status]);

  const reset = useCallback(() => {
    setStatus("idle");
    setPayment(null);
    setLicense(null);
    setError("");
  }, []);

  const start = useCallback(async (): Promise<LicenseRecord> => {
    if (running.current) throw new PurchaseError("failed");
    running.current = true;
    setError("");
    try {
      const requester = address;
      if (!isConnected || !requester) {
        setStatus("no-wallet");
        throw new PurchaseError("no-wallet");
      }

      const pending = readPending();
      if (pending && pending.contentId.toLowerCase() === contentId.toLowerCase()) {
        setStatus("verifying");
        const lic = await submitPayment(pending.paymentTxHash, requester, {
          contentId,
          usage,
          intendsModification,
          intendsPoliticalUse,
        });
        clearPending();
        setLicense(lic);
        setStatus("issued");
        return lic;
      }

      if (chainId !== undefined && chainId !== sepolia.id) {
        setStatus("switching-network");
        try {
          await switchChainAsync({ chainId: sepolia.id });
        } catch (e) {
          if (isUserRejected(e)) {
            setStatus("cancelled");
            throw new PurchaseError("cancelled");
          }
          setStatus("failed");
          throw new PurchaseError("failed");
        }
      }

      setStatus("preparing");
      const quoted = await requestLicense({ contentId, usage, intendsModification, intendsPoliticalUse, requester });
      if (quoted.status === "issued") {
        setLicense(quoted.license);
        setStatus("issued");
        return quoted.license;
      }
      const pay = quoted.payment;
      setPayment(pay);

      if (!walletClient || !publicClient) {
        setStatus("failed");
        throw new PurchaseError("failed");
      }

      setStatus("awaiting-approval");
      let txHash: `0x${string}`;
      try {
        txHash = await walletClient.sendTransaction({
          chain: sepolia,
          to: pay.payTo as `0x${string}`,
          value: BigInt(pay.amountWei),
          // Bind the payment to THIS content request so the backend can prove
          // the transfer was made for it (and never reused for another).
          ...(pay.paymentIntentData ? { data: pay.paymentIntentData as `0x${string}` } : {}),
        });
      } catch (e) {
        if (isUserRejected(e)) {
          setStatus("cancelled");
          throw new PurchaseError("cancelled");
        }
        setStatus("failed");
        throw new PurchaseError("failed");
      }

      setStatus("submitted");
      setPayment(null);
      // Persist the moment the tx leaves the wallet — if the user reloads
      // during confirmation, start() resumes from this hash instead of
      // sending a second payment for the same licence.
      writePending({ contentId, paymentTxHash: txHash });
      setStatus("confirming");
      try {
        await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 });
      } catch (e) {
        if (isUserRejected(e)) {
          setStatus("cancelled");
          throw new PurchaseError("cancelled");
        }
        setStatus("failed");
        throw new PurchaseError("failed");
      }

      setStatus("verifying");
      const lic = await submitPayment(txHash, requester, {
        contentId,
        usage,
        intendsModification,
        intendsPoliticalUse,
      });
      clearPending();
      setLicense(lic);
      setStatus("issued");
      return lic;
    } catch (e) {
      if (e instanceof PurchaseError) throw e;
      setStatus("failed");
      setError(e instanceof Error ? e.message : String(e));
      throw new PurchaseError("failed");
    } finally {
      running.current = false;
    }
  }, [
    address,
    isConnected,
    chainId,
    walletClient,
    publicClient,
    switchChainAsync,
    contentId,
    usage,
    intendsModification,
    intendsPoliticalUse,
  ]);

  return { status, payment, license, error, busy, start, reset };
}
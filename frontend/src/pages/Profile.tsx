import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { sepolia } from "wagmi/chains";
import { waitForTransactionReceipt } from "viem/actions";
import PostCard from "../components/feed/PostCard";
import { useIdentity } from "../components/layout/Shell";
import { Avatar, Button, Card, Loading, truncateAddress } from "../components/ui";
import { listPosts } from "../lib/client";
import type { PostRecord } from "../lib/api";
import { useSeo } from "../components/seo/Seo";
import { useDisplayName, useModZeroName } from "../lib/identity";
import { USERNAME_REGISTRY_ABI, USERNAME_REGISTRY_ADDRESS } from "../lib/usernameRegistry";

const USERNAME_PATTERN = /^[a-z0-9-]{3,32}$/;

export default function Profile() {
  useSeo({
    title: "Creator profile",
    description: "Posts, registered works and on-chain reputation for a ModZero creator.",
  });

  const { address: routeAddress } = useParams<{ address: string }>();
  const { address: mine } = useIdentity();
  const who = routeAddress ?? mine ?? "";
  const isMe = !!mine && who.toLowerCase() === mine.toLowerCase();

  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [localUsername, setLocalUsername] = useState<string | null>(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  const walletClient = useWalletClient().data;
  const publicClient = usePublicClient();
  const { address: connectedAddress } = useAccount();
  const registering = !!pending;

  const resolvedUsername = useModZeroName(who);
  const username = resolvedUsername ?? localUsername;
  const resolvedDisplay = useDisplayName(who);
  const queryClient = useQueryClient();

  useEffect(() => {
    listPosts()
      .then(setPosts)
      .finally(() => setLoading(false));
  }, []);

  async function handleRegister() {
    const name = usernameInput.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(name)) {
      setRegisterError("Usernames must be 3-32 characters: lowercase letters, numbers, and hyphens only.");
      return;
    }
    if (!USERNAME_REGISTRY_ADDRESS) {
      setRegisterError("UsernameRegistry address is not configured (VITE_USERNAME_REGISTRY_ADDRESS).");
      return;
    }
    if (!walletClient || !publicClient || !connectedAddress) {
      setRegisterError("Your wallet is not connected.");
      return;
    }
    setRegisterError("");
    setPending(name);
    setUsernameInput("");
    try {
      // The deployed UsernameRegistry only implements register(string):
      // owner becomes msg.sender — this wallet — so the registration is
      // signed and paid for by the user directly (see lib/usernameRegistry).
      //
      // Gas: Sepolia's Fusaka hardfork enforces a 16,777,216 per-tx gas cap
      // (EIP-7825). Some wallet/node estimators fall back to the chain gas
      // limit (21,000,000 on this RPC's view) when no explicit gas is
      // attached, which the node then rejects with "transaction gas limit
      // too high". Estimate on-chain and pin a small-buffer value instead;
      // it stays far under the cap and a real revert (e.g. name already
      // taken) surfaces here instead of as a gas-cap error in the wallet.
      const gasEstimate = await publicClient.estimateContractGas({
        address: USERNAME_REGISTRY_ADDRESS,
        abi: USERNAME_REGISTRY_ABI,
        functionName: "register",
        args: [name],
        account: connectedAddress,
      });
      const gas = (gasEstimate * 3n) / 2n; // +50% safety buffer
      const hash = await walletClient.writeContract({
        address: USERNAME_REGISTRY_ADDRESS,
        abi: USERNAME_REGISTRY_ABI,
        functionName: "register",
        args: [name],
        chain: sepolia,
        account: connectedAddress,
        gas,
      });
      const receipt = await waitForTransactionReceipt(publicClient, {
        hash,
        confirmations: 1,
      });
      if (receipt.status !== "success") {
        setRegisterError("Registration was reverted on-chain.");
        return;
      }
      setLocalUsername(name);
      const key = who.toLowerCase();
      queryClient.invalidateQueries({ queryKey: ["username", key] });
      queryClient.invalidateQueries({ queryKey: ["displayName", key] });
    } catch (err) {
      const e = err as { name?: string; shortMessage?: string; message?: string };
      setRegisterError(
        e.name === "UserRejectedRequestError"
          ? "Registration was rejected in your wallet."
          : (e.shortMessage ?? e.message ?? "Registration failed")
      );
    } finally {
      setPending(null);
    }
  }

  const owned = posts.filter((p) => p.creatorAddress.toLowerCase() === who.toLowerCase());
  const works = owned.filter((p) => p.contentId).length;
  const reputation = owned[0]?.creatorReputation ?? 0;

  if (!who) {
    return (
      <div className="mx-auto max-w-[760px] px-8 py-28 text-center">
        <h1 className="text-[38px] font-bold tracking-tight text-navy">Connect a wallet</h1>
        <p className="mt-4 text-[20px] text-slate">Your studio shows everything you&apos;ve posted.</p>
      </div>
    );
  }

  // Display priority: on-chain username > ENS name > truncated address
  const displayName = resolvedDisplay ?? truncateAddress(who, 8);

  return (
    <div className="mx-auto max-w-[900px] px-8 py-14">
      <header className="flex flex-wrap items-center gap-7 border-b border-line pb-10">
        <Avatar seed={who} size={92} />
        <div className="flex-1">
          <h1 className="font-mono text-[clamp(24px,3.4vw,36px)] font-bold tracking-tight text-navy">
            {displayName}
          </h1>
          <p className="mt-1 text-[18px] text-muted">{isMe ? "Your studio" : "Creator"}</p>
        </div>
        {isMe && (
          <Link to="/compose">
            <Button>New post</Button>
          </Link>
        )}
      </header>

      {isMe && !username && (
        <Card className="mt-8 p-7">
          <h2 className="text-[18px] font-bold tracking-tight text-navy">Claim your ModZero username</h2>
          <p className="mt-2 text-[16px] text-slate">
            Register a name on-chain so people see <span className="font-mono">yourname.modzero</span> instead
            of your wallet address. Your wallet signs and pays for this — takes a few seconds to confirm.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <input
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value.toLowerCase())}
              placeholder="yourname"
              maxLength={32}
              className="flex-1 min-w-[200px] rounded-lg border border-line px-4 py-2.5 font-mono text-sm focus:outline-none focus:border-navy"
            />
            <Button onClick={handleRegister} disabled={!usernameInput || registering}>
              {registering ? "Registering…" : "Register"}
            </Button>
          </div>
          {registerError && (
            <p className="mt-2 text-sm text-red-600">{registerError}</p>
          )}
          <p className="mt-2 text-xs text-muted">3-32 characters, lowercase letters, numbers, and hyphens only.</p>
        </Card>
      )}

      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {[
          { label: "Posts", value: String(owned.length) },
          { label: "Registered works", value: String(works) },
          { label: "Reputation", value: `${reputation > 0 ? "+" : ""}${reputation}` },
        ].map((s) => (
          <Card key={s.label} className="p-7">
            <p className="text-[40px] font-bold leading-none tracking-tight text-navy">{s.value}</p>
            <p className="mt-3 text-[17px] text-muted">{s.label}</p>
          </Card>
        ))}
      </div>

      <h2 className="mb-7 mt-14 text-[28px] font-bold tracking-tight text-navy">Posts</h2>
      {loading ? (
        <Loading />
      ) : owned.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-[19px] text-slate">Nothing posted from this address yet.</p>
        </Card>
      ) : (
        <div className="space-y-7">
          {owned.map((post, i) => (
            <PostCard key={post.postId} post={post} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
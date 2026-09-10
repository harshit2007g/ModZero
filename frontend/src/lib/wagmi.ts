import { http, createConfig } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

/**
 * Sepolia is the app chain. Mainnet is configured too — not to transact on, but
 * because ENS lives there: `useEnsName({ chainId: mainnet.id })` throws
 * "chain not configured" without a transport for it, which is what was making
 * the wallet area misbehave.
 */
export const wagmiConfig = createConfig({
  chains: [sepolia, mainnet],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
});

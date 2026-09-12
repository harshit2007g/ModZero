import { Router } from "express";
import { ethers } from "ethers";
import {
  registerUsernameOnChain,
  resolveUsernameOnChain,
  reverseResolveUsernameOnChain,
} from "../services/blockchain.js";

const router = Router();

const USERNAME_PATTERN = /^[a-z0-9-]{3,32}$/;

/**
 * POST /username
 * Body: { username }
 * Registers a username on-chain, owned by the backend wallet's address
 * for now (see known simplification note in blockchain.ts). Real
 * client-side wallet signing is a natural next step, not done here.
 */
router.post("/username", async (req, res) => {
  try {
    const { username } = req.body ?? {};
    if (!username || typeof username !== "string") {
      return res.status(400).json({ error: "username is required" });
    }
    if (!USERNAME_PATTERN.test(username)) {
      return res
        .status(400)
        .json({ error: "username must be 3-32 characters, lowercase a-z, 0-9, and hyphens only" });
    }

    const ethereumTxHash = await registerUsernameOnChain(username);
    res.status(201).json({ username, ethereumTxHash });
  } catch (err) {
    console.error("[POST /username] failed:", err);
    const message = err instanceof Error ? err.message : "failed to register username";
    // Surface contract revert reasons (e.g. "username already registered")
    // directly rather than a generic 500, since they're meaningful to the caller.
    res.status(400).json({ error: message });
  }
});

/**
 * GET /username/resolve?name=harshit
 * Forward resolution: username -> address.
 */
router.get("/username/resolve", async (req, res) => {
  const name = req.query.name as string;
  if (!name) return res.status(400).json({ error: "name query param is required" });

  const address = await resolveUsernameOnChain(name);
  res.json({ username: name, address });
});

/**
 * GET /username/lookup?address=0x...
 * Reverse resolution: address -> username.
 */
router.get("/username/lookup", async (req, res) => {
  const address = req.query.address as string;
  if (!address || !ethers.isAddress(address)) {
    return res.status(400).json({ error: "a valid address query param is required" });
  }

  const username = await reverseResolveUsernameOnChain(address);
  res.json({ address, username });
});

export default router;
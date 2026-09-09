import { Router } from "express";
import { ethers } from "ethers";
import { resolveEnsName, lookupEnsName } from "../services/ens.js";

const router = Router();

/**
 * GET /ens/resolve?name=alice.eth
 * Forward resolution — used to verify an ENS name actually resolves to
 * an address before trusting it as a creator identity (spec §7).
 */
router.get("/ens/resolve", async (req, res) => {
  const name = req.query.name as string;
  if (!name) return res.status(400).json({ error: "name query param is required" });

  const address = await resolveEnsName(name);
  res.json({ name, address });
});

/**
 * GET /ens/lookup?address=0x...
 * Reverse resolution — used to auto-populate a creator's display name
 * from their wallet address if they didn't type one in.
 */
router.get("/ens/lookup", async (req, res) => {
  const address = req.query.address as string;
  if (!address || !ethers.isAddress(address)) {
    return res.status(400).json({ error: "a valid address query param is required" });
  }

  const name = await lookupEnsName(address);
  res.json({ address, name });
});

export default router;
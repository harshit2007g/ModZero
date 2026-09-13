import { Router } from "express";
import { ethers } from "ethers";
import {
    resolveUsernameOnChain,
    reverseResolveUsernameOnChain,
} from "../services/blockchain.js";

const router = Router();

/**
 * NOTE: There is intentionally NO POST /username here. UsernameRegistry
 * only implements 1-arg `register(string)` (owner = msg.sender) — matching
 * both the deployed registry and the contract source. Registration is signed
 * directly by the user's own wallet in the frontend (see
 * frontend/src/lib/usernameRegistry.ts), so the backend is read-only for
 * usernames: forward + reverse resolution only.
 */

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
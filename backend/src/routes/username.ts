import { Router } from "express";
import { ethers } from "ethers";
import {
    registerUsernameOnChain,
    resolveUsernameOnChain,
    reverseResolveUsernameOnChain,
} from "../services/blockchain.js";

const router = Router();

const USERNAME_PATTERN = /^[a-z0-9-]{3,32}$/;

router.post("/username", async (req, res) => {
    try {
        const { username, address } = req.body ?? {};
        if (!username || typeof username !== "string") {
            return res.status(400).json({ error: "username is required" });
        }
        if (!address || !ethers.isAddress(address)) {
            return res.status(400).json({ error: "a valid address is required" });
        }
        if (!USERNAME_PATTERN.test(username)) {
            return res
                .status(400)
                .json({ error: "username must be 3-32 characters, lowercase a-z, 0-9, and hyphens only" });
        }

        const ethereumTxHash = await registerUsernameOnChain(username, address);
        res.status(201).json({ username, address, ethereumTxHash });
    } catch (err) {
        console.error("[POST /username] failed:", err);
        const message = err instanceof Error ? err.message : "failed to register username";
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
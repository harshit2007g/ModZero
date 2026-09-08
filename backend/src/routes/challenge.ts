import { Router } from "express";
import { ethers } from "ethers";
import {
  createChallengeOnChain,
  voteOnChallengeOnChain,
  resolveChallengeOnChain,
  getChallengeOnChain,
} from "../services/blockchain.js";
import { getPostById } from "../database/postRepo.js";

const router = Router();

/**
 * POST /challenge
 * Body: { postId, challengerAddress }
 * Anyone can challenge any post. Both challenger and (implicitly) the
 * post's creator have stake at risk — no moderator decides guilt, the
 * community does via /challenge/:id/vote (spec extension: challenges).
 */
router.post("/challenge", async (req, res) => {
  try {
    const { postId } = req.body ?? {};
    if (!postId) return res.status(400).json({ error: "postId is required" });

    const post = getPostById(postId);
    if (!post) return res.status(404).json({ error: "post not found — cannot challenge unknown post" });

    const challengeId = ethers.hexlify(ethers.randomBytes(32));
    const ethereumTxHash = await createChallengeOnChain(challengeId, postId, post.creatorAddress);
    const onChainChallenge = await getChallengeOnChain(challengeId);

    res.status(201).json({ challengeId, ...onChainChallenge, ethereumTxHash });
  } catch (err) {
    console.error("[POST /challenge] failed:", err);
    res.status(500).json({ error: "failed to create challenge" });
  }
});

/**
 * POST /challenge/:id/vote
 * Body: { guilty: boolean }
 * NOTE: this currently votes using the BACKEND's own wallet, not the
 * caller's — same known simplification as license/claim. A real frontend
 * integration would have the voter sign this themselves via their own
 * wallet. Fine for demo purposes; must be called out honestly if asked.
 */
router.post("/challenge/:id/vote", async (req, res) => {
  try {
    const { guilty } = req.body ?? {};
    if (typeof guilty !== "boolean") return res.status(400).json({ error: "guilty (boolean) is required" });

    const ethereumTxHash = await voteOnChallengeOnChain(req.params.id, guilty);
    const onChainChallenge = await getChallengeOnChain(req.params.id);
    res.json({ challengeId: req.params.id, ...onChainChallenge, ethereumTxHash });
  } catch (err) {
    console.error("[POST /challenge/:id/vote] failed:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "failed to vote" });
  }
});

/**
 * POST /challenge/:id/resolve
 * Permissionless — anyone can trigger this once the voting window closes.
 */
router.post("/challenge/:id/resolve", async (req, res) => {
  try {
    const ethereumTxHash = await resolveChallengeOnChain(req.params.id);
    const onChainChallenge = await getChallengeOnChain(req.params.id);
    res.json({ challengeId: req.params.id, ...onChainChallenge, ethereumTxHash });
  } catch (err) {
    console.error("[POST /challenge/:id/resolve] failed:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "failed to resolve challenge" });
  }
});

router.get("/challenge/:id", async (req, res) => {
  try {
    const onChainChallenge = await getChallengeOnChain(req.params.id);
    if (onChainChallenge.state === "NONE") return res.status(404).json({ error: "challenge not found" });
    res.json({ challengeId: req.params.id, ...onChainChallenge });
  } catch (err) {
    res.status(500).json({ error: "failed to read challenge" });
  }
});

export default router;
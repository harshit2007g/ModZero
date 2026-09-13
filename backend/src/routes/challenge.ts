import { Router } from "express";
import { ethers } from "ethers";
import {
  createChallengeOnChain,
  voteOnChallengeOnChain,
  resolveChallengeOnChain,
  getChallengeOnChain,
} from "../services/blockchain.js";
import { getPostById } from "../database/postRepo.js";
import { saveChallengeIndex, listChallengeIndex } from "../database/challengeRepo.js";
import { publishHcsEvent } from "../services/hedera.js";

const router = Router();

/**
 * POST /challenge
 * Body: { postId, challengerAddress }
 * Anyone can challenge any post. Both challenger and (implicitly) the
 * post's creator have stake at risk — no moderator decides guilt, the
 * community does via /challenge/:id/vote (spec extension: challenges).
 * The challenge is also recorded in the local index so it survives page
 * reloads and can be listed per post (the chain has no enumeration).
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

    const hederaSequence = await publishHcsEvent({
      type: "CHALLENGE_CREATED",
      version: 1,
      challengeId,
      postId,
      challenger: onChainChallenge.challenger,
      creator: post.creatorAddress,
      timestamp: new Date().toISOString(),
    });

    saveChallengeIndex({
      challengeId,
      postId,
      createdAt: new Date().toISOString(),
      ethereumTxHash,
    });

    res.status(201).json({ challengeId, ...onChainChallenge, ethereumTxHash, hederaSequence });
  } catch (err) {
    console.error("[POST /challenge] failed:", err);
    res.status(500).json({ error: "failed to create challenge" });
  }
});

/**
 * GET /challenges?postId=...
 * Lists challenges the backend has created, hydrating each with its
 * current on-chain state, newest first. Optional postId filters to the
 * challenges of one post (used by the post detail page).
 */
router.get("/challenges", async (req, res) => {
  try {
    const postId = typeof req.query.postId === "string" && req.query.postId ? req.query.postId : undefined;
    const indexed = listChallengeIndex(postId);

    const hydrated = await Promise.all(
      indexed.map(async (row) => {
        const onChain = await getChallengeOnChain(row.challengeId);
        return { challengeId: row.challengeId, ...onChain };
      })
    );

    res.json(hydrated);
  } catch (err) {
    console.error("[GET /challenges] failed:", err);
    res.status(500).json({ error: "failed to list challenges" });
  }
});

/**
 * POST /challenge/:id/vote
 * Body: { guilty: boolean }
 * Keep as a backend helper for polling/automation, but the live app votes
 * WALLET-NATIVE from the voter's own wallet (see PostDetail.tsx) so each
 * ballot is a distinct on-chain address and quorum is actually reachable.
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
    res.status(500).json({ error: "failed to vote" });
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

    const hederaSequence = await publishHcsEvent({
      type: "CHALLENGE_RESOLVED",
      version: 1,
      challengeId: req.params.id,
      outcome: onChainChallenge.state === "RESOLVED_GUILTY" ? "GUILTY" : "NOT_GUILTY",
      timestamp: new Date().toISOString(),
    });

    res.json({ challengeId: req.params.id, ...onChainChallenge, ethereumTxHash, hederaSequence });
  } catch (err) {
    console.error("[POST /challenge/:id/resolve] failed:", err);
    res.status(500).json({ error: "failed to resolve challenge" });
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
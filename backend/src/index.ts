import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const app = express();
app.use(cors());
app.use(express.json({ limit: "25mb" })); // content uploads may be base64/multipart later

const PORT = process.env.BACKEND_PORT || 4000;

/**
 * Route map from docs/SPEC.md section 30. Each is a stub for now —
 * fill in as fingerprinting/watermarking (watermark/), Hedera publishing
 * (hedera/), and contract calls (contracts/) come online.
 */
app.get("/health", (_req, res) => res.json({ ok: true, service: "modzero-backend" }));

// POST /content            — register new content (fingerprint + watermark + stake + HCS event)
// GET  /content/:id         — fetch indexed content record
// GET  /content/:id/graph   — propagation graph for this content's lineage
// POST /verify              — check unknown content against registry (fingerprint/watermark match)
// POST /license/request     — forward a license request to the creator agent
// GET  /license/:id         — fetch license record
// POST /claim               — create a claim (evidence + no valid license)
// GET  /claim/:id           — fetch claim state

app.listen(PORT, () => {
  console.log(`[modzero-backend] listening on :${PORT}`);
});

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import contentRoutes from "./routes/content.js";
import verifyRoutes from "./routes/verify.js";
import licenseRoutes from "./routes/license.js";
import claimRoutes from "./routes/claim.js";

dotenv.config({ path: "../.env" });

const app = express();
app.use(cors());
app.use(express.json({ limit: "25mb" })); // content uploads may be base64/multipart later

const PORT = process.env.BACKEND_PORT || 4000;

/**
 * Route map from docs/SPEC.md section 30.
 *
 * IMPORTANT: these currently return realistic MOCK data so the frontend
 * team can build against a stable shape immediately. Real fingerprinting/
 * watermarking, Hedera publishing, and contract calls come next — see the
 * comments inside each routes/*.ts file for what each endpoint will do
 * once wired up for real. Response shapes should NOT change once frontend
 * starts building against them without a heads-up (breaking changes here
 * break their work).
 */
app.get("/health", (_req, res) => res.json({ ok: true, service: "modzero-backend" }));

app.use(contentRoutes); // POST /content, GET /content/:id, GET /content/:id/graph
app.use(verifyRoutes); // POST /verify
app.use(licenseRoutes); // POST /license/request, GET /license/:id
app.use(claimRoutes); // POST /claim, GET /claim/:id

app.listen(PORT, () => {
  console.log(`[modzero-backend] listening on :${PORT}`);
});

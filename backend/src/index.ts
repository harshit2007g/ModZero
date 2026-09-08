
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
app.use(express.json({ limit: "25mb" }));

const PORT = process.env.BACKEND_PORT || 4000;

app.get("/health", (_req, res) => res.json({ ok: true, service: "modzero-backend" }));

app.use(contentRoutes);
app.use(verifyRoutes);
app.use(licenseRoutes);
app.use(claimRoutes);

app.listen(PORT, () => {
  console.log(`[modzero-backend] listening on :${PORT}`);
});

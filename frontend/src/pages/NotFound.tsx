import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-3xl font-semibold tracking-tight">Nothing here</h1>
        <p className="mt-3 text-paper-dim">
          No proof exists for this page — check the link, or head back home.
        </p>
        <Link
          to="/"
          className="mt-8 inline-block glow-btn px-5 py-2.5 rounded-full bg-gold text-ink-950 font-medium hover:bg-gold-bright transition-colors"
        >
          Back to landing
        </Link>
      </motion.div>
    </div>
  );
}
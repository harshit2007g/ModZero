import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div className="mx-auto max-w-4xl px-6">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="pt-24 pb-16"
      >
        <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight leading-[1.05] max-w-2xl">
          No moderator.
          <br />
          <span className="bg-gradient-to-r from-gold via-purple-300 to-cyan-300 bg-clip-text text-transparent">
            Just proof.
          </span>
        </h1>
        <p className="mt-6 text-lg text-paper-dim max-w-xl leading-relaxed">
          ModZero traces where content came from, enforces the terms its creator set, and settles disputes with
          cryptographic evidence instead of a platform's judgment call.
        </p>
        <div className="mt-8 flex gap-4">
          <Link
            to="/upload"
            className="glow-btn px-5 py-2.5 rounded-full bg-gold text-ink-950 font-medium hover:bg-gold-bright transition-colors"
          >
            Publish content
          </Link>
          <Link
            to="/dashboard"
            className="glow-btn px-5 py-2.5 rounded-full glass hover:border-gold/50 transition-colors"
          >
            View dashboard
          </Link>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="py-14 grid sm:grid-cols-3 gap-6"
      >
        <div className="glass rounded-2xl p-6">
          <h2 className="font-mono text-sm text-gold mb-2">prove</h2>
          <p className="text-paper-dim leading-relaxed text-sm">
            A perceptual fingerprint and an invisible watermark tie every upload back to the moment it was
            registered — recompression or resizing won't break the link.
          </p>
        </div>
        <div className="glass rounded-2xl p-6">
          <h2 className="font-mono text-sm text-gold mb-2">trace</h2>
          <p className="text-paper-dim leading-relaxed text-sm">
            Every registration, license, and claim is a real transaction. Anyone can follow a piece of content
            back to its root, independent of what ModZero itself says.
          </p>
        </div>
        <div className="glass rounded-2xl p-6">
          <h2 className="font-mono text-sm text-gold mb-2">license</h2>
          <p className="text-paper-dim leading-relaxed text-sm">
            Creators set machine-readable terms once. An autonomous agent evaluates every request against
            them — no back-and-forth, no waiting on a reply.
          </p>
        </div>
      </motion.section>
    </div>
  );
}
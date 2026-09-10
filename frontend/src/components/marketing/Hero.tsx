import { Link } from "react-router-dom";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";
import { Avatar, Button, Pill } from "../ui";
import { demoImage } from "../../lib/demo";

const EXPO = [0.16, 1, 0.3, 1] as const;

/** A mock post that floats and parallaxes — the page's one piece of hero art. */
function FloatingPost() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const p = useSpring(scrollYProgress, { stiffness: 60, damping: 26, mass: 0.5 });
  const y = useTransform(p, [0, 1], [40, -90]);
  const rotate = useTransform(p, [0, 1], [-2.5, 2]);

  return (
    <div ref={ref} className="relative">
      <motion.div style={{ y, rotate }} className="relative">
        <div className="float card w-full max-w-[430px] overflow-hidden">
          <div className="flex items-center gap-4 px-6 pt-6">
            <Avatar seed="alice.eth" size={48} />
            <div className="flex-1">
              <p className="text-[18px] font-semibold text-navy">alice.eth</p>
              <p className="text-[16px] text-muted">just now</p>
            </div>
            <Pill tone="brand">Original</Pill>
          </div>
          <p className="px-6 py-5 text-[19px] leading-relaxed text-navy">
            Registered at upload. Fingerprint and watermark on record.
          </p>
          <img src={demoImage("hero-plate")} alt="Example registered work shown inside a ModZero post card" className="w-full object-cover" />
        </div>

        {/* the "caught" receipt tucked underneath */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.9, ease: EXPO }}
          className="card absolute -bottom-14 -left-10 w-[300px] p-5"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[#fdeaec] text-[20px]">
              ⚑
            </span>
            <div>
              <p className="text-[17px] font-semibold text-navy">Reuse detected</p>
              <p className="text-[16px] text-muted">96% match · 0.02 ETH owed</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="bloom drift" />
      <div className="dots pointer-events-none absolute inset-0 opacity-[0.55]" />

      <div className="relative mx-auto grid max-w-[1440px] items-center gap-16 px-8 pb-32 pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:pt-28">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EXPO }}
          >
            <Pill tone="brand">Content provenance protocol</Pill>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30, filter: "blur(12px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1.2, delay: 0.1, ease: EXPO }}
            className="mt-8 text-[clamp(54px,7vw,96px)] font-bold leading-[1.02] tracking-[-0.04em] text-navy"
          >
            Proof of authorship,{" "}
            <span className="grad-text shimmer">built into the upload</span>.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: EXPO }}
            className="mt-9 max-w-xl text-[23px] leading-[1.55] text-slate"
          >
            Every image is fingerprinted and watermarked before it publishes. Reuse is
            detected automatically, priced by the creator&apos;s agent, and settled on-chain.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.45, ease: EXPO }}
            className="mt-12 flex flex-wrap gap-4"
          >
            <Link to="/compose">
              <Button size="lg">Publish a work</Button>
            </Link>
            <Link to="/verify">
              <Button size="lg" variant="outline">
                Check an image
              </Button>
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.4, delay: 0.35, ease: EXPO }}
          className="hidden lg:block"
        >
          <FloatingPost />
        </motion.div>
      </div>
    </section>
  );
}

import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { demoImage } from "../../lib/demo";

/**
 * The scroll-linked section.
 *
 * The panel pins to the viewport while three steps scroll past it. Everything —
 * which step is lit, the artwork on the right, the progress rail — is derived
 * from scroll position, so it scrubs both ways instead of firing once.
 */

const STEPS = [
  {
    n: "01",
    title: "Registration",
    body: "The image is perceptually fingerprinted and an invisible watermark is embedded before it enters the feed. Neither survives being cropped out.",
  },
  {
    n: "02",
    title: "Consensus timestamp",
    body: "A Hedera event records authorship in a consensus-ordered log. Priority stops being a matter of dispute and becomes a matter of record.",
  },
  {
    n: "03",
    title: "Automated settlement",
    body: "Reuse is matched back to the original even after cropping or recompression. The creator's agent prices the licence and payment settles on Ethereum.",
  },
];

function Step({
  step,
  index,
  progress,
}: {
  step: (typeof STEPS)[number];
  index: number;
  progress: MotionValue<number>;
}) {
  const start = index / STEPS.length;
  const end = (index + 1) / STEPS.length;
  const opacity = useTransform(progress, [start - 0.14, start + 0.04, end - 0.04, end + 0.14], [0.28, 1, 1, 0.28]);
  const x = useTransform(progress, [start - 0.14, start + 0.04], [24, 0]);

  return (
    <motion.div style={{ opacity, x }} className="border-l-4 border-brand/25 pl-8">
      <span className="font-mono text-[18px] font-bold text-brand">{step.n}</span>
      <h3 className="mt-3 text-[clamp(30px,3.4vw,42px)] font-bold leading-tight tracking-[-0.025em] text-navy">
        {step.title}
      </h3>
      <p className="mt-4 max-w-md text-[20px] leading-relaxed text-slate">{step.body}</p>
    </motion.div>
  );
}

function Frame({
  index,
  progress,
  children,
}: {
  index: number;
  progress: MotionValue<number>;
  children: React.ReactNode;
}) {
  const start = index / STEPS.length;
  const end = (index + 1) / STEPS.length;
  const opacity = useTransform(progress, [start - 0.1, start + 0.06, end - 0.06, end + 0.1], [0, 1, 1, 0]);
  const scale = useTransform(progress, [start - 0.1, start + 0.06, end + 0.1], [0.92, 1, 1.04]);
  const y = useTransform(progress, [start - 0.1, end + 0.1], [40, -40]);
  return (
    <motion.div style={{ opacity, scale, y }} className="absolute inset-0 grid place-items-center">
      {children}
    </motion.div>
  );
}

export default function ScrollStory() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 80, damping: 26, mass: 0.4 });
  const railHeight = useTransform(progress, [0, 1], ["0%", "100%"]);

  return (
    <section ref={ref} className="band relative" style={{ height: "300vh" }}>
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="bloom drift opacity-70" />

        <div className="relative mx-auto grid w-full max-w-[1440px] items-center gap-16 px-8 lg:grid-cols-2">
          {/* left: the steps */}
          <div className="relative">
            <div className="absolute left-0 top-0 h-full w-1 rounded-full bg-brand/15">
              <motion.div style={{ height: railHeight }} className="w-full rounded-full bg-brand" />
            </div>
            <div className="space-y-16">
              {STEPS.map((step, i) => (
                <Step key={step.n} step={step} index={i} progress={progress} />
              ))}
            </div>
          </div>

          {/* right: the artwork, one frame per step */}
          <div className="relative hidden h-[480px] lg:block">
            <Frame index={0} progress={progress}>
              <div className="card relative w-full max-w-[420px] overflow-hidden">
                <img src={demoImage("story-1")} alt="Fingerprint being extracted from a registered image" className="w-full object-cover" />
                <div className="absolute inset-x-0 top-1/3 h-24 bg-gradient-to-b from-transparent via-brand/30 to-transparent" />
                <div className="p-6">
                  <p className="font-mono text-[17px] text-muted">dHash · 9f2c4a71d0e83b56</p>
                  <p className="mt-1 text-[18px] font-semibold text-navy">Watermark embedded</p>
                </div>
              </div>
            </Frame>

            <Frame index={1} progress={progress}>
              <div className="card w-full max-w-[420px] p-8">
                <p className="text-[17px] text-muted">Hedera Consensus Service</p>
                <p className="mt-3 font-mono text-[44px] font-bold leading-none text-navy">#101</p>
                <p className="mt-3 text-[19px] text-slate">CONTENT_CREATED — sequence assigned</p>
                <div className="mt-7 space-y-3">
                  {["alice.eth", "consensus timestamp", "commitment hash"].map((row) => (
                    <div key={row} className="flex items-center gap-3">
                      <span className="h-2.5 w-2.5 rounded-full bg-mint" />
                      <span className="text-[18px] text-slate">{row}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Frame>

            <Frame index={2} progress={progress}>
              <div className="card w-full max-w-[420px] p-8">
                <div className="flex items-center justify-between">
                  <p className="text-[19px] font-semibold text-navy">Licence issued</p>
                  <span className="rounded-full bg-[#e2f6f0] px-4 py-2 text-[16px] font-semibold text-mint">
                    Settled
                  </span>
                </div>
                <p className="mt-6 text-[52px] font-bold leading-none tracking-tight text-navy">
                  0.02 <span className="text-[26px] text-muted">ETH</span>
                </p>
                <div className="mt-7 flex items-center gap-4 border-t border-line pt-6">
                  <span className="text-[18px] text-slate">bob.eth</span>
                  <span className="text-[18px] text-muted">→</span>
                  <span className="text-[18px] font-semibold text-navy">alice.eth</span>
                </div>
              </div>
            </Frame>
          </div>
        </div>
      </div>
    </section>
  );
}

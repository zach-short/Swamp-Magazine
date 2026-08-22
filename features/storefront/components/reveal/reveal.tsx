"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

// The storefront's one scroll-entrance primitive: quiet fade-and-rise, fired
// once as the element enters the viewport. Keeping a single primitive keeps
// the motion language consistent across lanes built in parallel.
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  // prefers-reduced-motion users get the content immediately, no rise/fade.
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

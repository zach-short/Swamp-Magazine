"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

// App Router remounts templates on navigation, so this is the page
// transition: every route change gets the same quiet fade (P2, Motion).
// Default export is the framework's contract for template files.
export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

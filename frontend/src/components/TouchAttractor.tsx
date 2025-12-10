"use client";

import { motion } from "framer-motion";
import { BsHandIndexThumb } from "react-icons/bs";
import React from "react";

interface TouchAttractorProps {
  size?: number; // outer pulse diameter (px)
  className?: string;
}

export default function TouchAttractor({ size = 200, className = "" }: TouchAttractorProps) {
  const ring = {
    initial: { scale: 0.7, opacity: 0.6 },
    animate: { scale: 1.2, opacity: 0 },
    transition: { duration: 1.4, repeat: Infinity, ease: "easeOut" },
  } as const;

  return (
    <div
      className={`pointer-events-none relative ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <motion.span
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ width: size, height: size, border: "2px solid var(--color-accent)" }}
        {...ring}
      />
      <motion.span
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ width: size * 0.8, height: size * 0.8, border: "2px solid var(--color-accent)" }}
        initial={{ scale: 0.7, opacity: 0.6 }}
        animate={{ scale: 1.2, opacity: 0 }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
      />

      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent-soft)]"
        style={{ width: size * 0.36, height: size * 0.36 }}
        initial={{ scale: 0.9, opacity: 0.9 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
      />

      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[var(--color-accent)]"
        initial={{ y: -4 }}
        animate={{ y: 2 }}
        transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
      >
        <BsHandIndexThumb size={size * 0.22} />
      </motion.div>
    </div>
  );
}


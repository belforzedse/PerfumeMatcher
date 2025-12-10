"use client";

import React, { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface TapIndicatorProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

export default function TapIndicator({
  size = 180,
  color = "var(--color-accent)",
  strokeWidth = 3,
  className = "",
}: TapIndicatorProps) {
  const gradientId = useId();
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className={className}
        aria-hidden
      >
        <defs>
          <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="50" cy="50" r="6" fill={color} />
        <circle cx="50" cy="50" r="36" fill={`url(#${gradientId})`} opacity={0.4} />
        <circle
          cx="50"
          cy="50"
          r="32"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeOpacity={0.35}
        />
      </svg>
    );
  }

  const ripples = [0, 0.55, 1.1];

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
    >
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>

      <motion.circle
        cx="50"
        cy="50"
        r="38"
        fill={`url(#${gradientId})`}
        initial={{ opacity: 0.3 }}
        animate={{ opacity: [0.32, 0.46, 0.32] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: [0.45, 0, 0.2, 1] }}
      />

      {ripples.map((delay) => (
        <motion.circle
          key={delay}
          cx="50"
          cy="50"
          r="24"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeOpacity={0.75}
          style={{ originX: "50%", originY: "50%" }}
          initial={{ scale: 0.6, opacity: 0.75 }}
          animate={{ scale: 1.45, opacity: 0 }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            repeatDelay: 0.2,
            ease: [0.16, 1, 0.3, 1],
            delay,
          }}
        />
      ))}

      <motion.circle
        cx="50"
        cy="50"
        r="8"
        fill={color}
        initial={{ scale: 0.92 }}
        animate={{ scale: [0.95, 1.1, 0.95] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: [0.45, 0, 0.2, 1] }}
      />
    </motion.svg>
  );
}

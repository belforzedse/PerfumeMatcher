import React from "react";

interface FingerTapProps {
  size?: number;
  color?: string;
  className?: string;
}

// Minimal finger + ripple animation using SVG (no extra CSS)
export default function FingerTap({
  size = 160,
  color = "var(--color-accent)",
  className = "",
}: FingerTapProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden
    >
      <defs>
        <radialGradient id="ft-fade" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ripple */}
      <circle cx="50" cy="50" r="20" fill="none" stroke={color} strokeWidth={2} strokeOpacity="0.6">
        <animate attributeName="r" values="20;44" dur="1.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <circle cx="50" cy="50" r="20" fill="none" stroke={color} strokeWidth={2} strokeOpacity="0.6">
        <animate attributeName="r" values="20;44" dur="1.6s" begin="-0.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0" dur="1.6s" begin="-0.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="50" cy="50" r="44" fill="url(#ft-fade)" />

      {/* finger group */}
      <g transform="translate(0 0)">
        <g>
          {/* fingertip */}
          <circle cx="58" cy="38" r="6" fill={color} />
          {/* finger segment */}
          <rect x="54" y="38" width="8" height="20" rx="3" ry="3" fill={color} />
          {/* palm */}
          <rect x="42" y="52" width="24" height="16" rx="6" ry="6" fill={color} opacity={0.9} />

          {/* tap motion */}
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0 0; 0 -4; 0 0"
            dur="1.3s"
            repeatCount="indefinite"
          />
        </g>
      </g>
    </svg>
  );
}


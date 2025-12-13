"use client";

import { useState, useEffect } from "react";

/**
 * Hook to detect if viewport height meets a minimum threshold
 * Useful for responsive design based on viewport height (e.g., tablet mode)
 * 
 * @param minHeight - Minimum height in pixels (default: 768)
 * @returns boolean indicating if viewport height >= minHeight
 */
export function useViewportHeight(minHeight: number = 768): boolean {
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    // SSR-safe: only run on client
    if (typeof window === "undefined") return;

    const checkHeight = () => {
      setIsTablet(window.innerHeight >= minHeight);
    };

    // Check immediately
    checkHeight();

    // Listen for resize events
    window.addEventListener("resize", checkHeight);

    // Cleanup
    return () => window.removeEventListener("resize", checkHeight);
  }, [minHeight]);

  return isTablet;
}


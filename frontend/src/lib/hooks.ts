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

/**
 * Hook to detect kiosk mode: tall portrait displays (height >= 1024px and width < height)
 * Useful for showing special kiosk-style UI on vertical displays
 * 
 * @returns boolean indicating if viewport is in kiosk mode
 */
export function useKioskMode(): boolean {
  const [isKiosk, setIsKiosk] = useState(false);

  useEffect(() => {
    // SSR-safe: only run on client
    if (typeof window === "undefined") return;

    const checkKiosk = () => {
      const height = window.innerHeight;
      const width = window.innerWidth;
      setIsKiosk(height >= 1024 && width < height);
    };

    // Check immediately
    checkKiosk();

    // Listen for resize events
    window.addEventListener("resize", checkKiosk);

    // Cleanup
    return () => window.removeEventListener("resize", checkKiosk);
  }, []);

  return isKiosk;
}


"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function ConditionalBodyClass() {
  const pathname = usePathname();

  useEffect(() => {
    const body = document.body;

    // Apply kiosk-body class only if we're NOT in admin area
    if (pathname.startsWith("/admin")) {
      // Remove kiosk-body class to show cursor in admin area
      body.classList.remove("kiosk-body");
    } else {
      // Add kiosk-body class to hide cursor in kiosk mode
      body.classList.add("kiosk-body");
    }

    // Cleanup function to remove the class when component unmounts
    return () => {
      body.classList.remove("kiosk-body");
    };
  }, [pathname]);

  // This component doesn't render anything
  return null;
}
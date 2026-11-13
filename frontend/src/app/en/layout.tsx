import type { Metadata } from "next";
import styles from "./kiosk.module.css";

export const metadata: Metadata = {
  title: "PerfumeMatcher | English fragrance finder",
  description: "Find fragrances by occasion, scent notes and intensity.",
};

export default function EnglishKioskLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.kiosk} lang="en" dir="ltr">{children}</div>;
}

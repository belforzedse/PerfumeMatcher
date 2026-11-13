import Image from "next/image";
import Link from "next/link";
import { FragranceFinder } from "./fragrance-finder";
import styles from "./kiosk.module.css";

export default function EnglishKiosk() {
  return (
    <>
      <header className={styles.header}>
        <div className={styles.shell}>
          <Link className={styles.brand} href="/en">Perfume<span>Matcher</span></Link>
          <Link className={styles.language} href="/" lang="fa" dir="rtl">فارسی</Link>
        </div>
      </header>
      <main className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.intro}>
            <h1>Find your next fragrance</h1>
            <p>Choose the notes you like, where you’ll wear it, and how strong you want it to be. We’ll suggest a shortlist from the catalog.</p>
            <a className={styles.action} href="#preferences">Choose your notes <span aria-hidden="true">↓</span></a>
          </div>
          <Image
            src="/images/amber-bottle.webp"
            alt="An amber perfume bottle on walnut beside a curl of orange peel"
            width={1200}
            height={800}
            priority
          />
        </section>
        <FragranceFinder />
      </main>
      <footer className={`${styles.shell} ${styles.footer}`}>
        <a href="https://github.com/belforzedse/PerfumeMatcher">View source on GitHub</a>
      </footer>
    </>
  );
}

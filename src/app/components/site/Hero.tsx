import Link from "next/link";
import Image from "next/image";
import styles from "./Hero.module.css";

export default function Hero() {
  return (
    <section id="top" className={styles.hero}>
      <Image
        src="/img/hero-city.jpg"
        alt="City skyline at dusk"
        fill
        priority
        sizes="100vw"
        className={styles.bg}
      />
      <div className={styles.overlay} aria-hidden />

      <div className={styles.inner}>
        <h1 className={styles.title}>Public proof for private claims.</h1>
        <p className={styles.sub}>
          Nyalthe settles event-based payouts on Starknet while keeping the claimant
          protected.
        </p>
        <div className={styles.actions}>
          <Link href="/app" className={styles.primary}>
            Open the app
          </Link>
          <a href="/#proof" className={styles.secondary}>
            See the proof model
          </a>
        </div>
      </div>
    </section>
  );
}

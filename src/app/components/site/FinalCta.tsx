import Link from "next/link";
import styles from "./FinalCta.module.css";

export default function FinalCta() {
  return (
    <section id="start" className={styles.section}>
      <div className={styles.inner}>
        <h2 className={styles.title}>Prove the payout. Protect the person.</h2>
        <p className={styles.sub}>
          Open the app to run a settlement on Starknet, or see how a claim goes from a
          funded policy to a private payout.
        </p>
        <div className={styles.actions}>
          <Link href="/app" className={styles.primary}>
            Open the app
          </Link>
          <a href="/#how-it-works" className={styles.secondary}>
            See how it works
          </a>
        </div>
      </div>
    </section>
  );
}

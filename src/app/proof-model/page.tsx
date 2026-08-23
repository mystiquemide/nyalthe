import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "../components/site/SiteNav";
import Footer from "../components/site/Footer";
import styles from "../components/site/Subpage.module.css";

export const metadata: Metadata = {
  title: "Proof model · Nyalthe",
  description:
    "What Nyalthe proves in public and what it keeps protected: the policy and settlement are verifiable on Starknet, the claimant stays private.",
};

const PUBLIC = [
  "The policy terms and its funded reserve",
  "The accepted event and its on-chain replay protection",
  "The contract logic every claim runs through",
  "Each state change and the settlement, as transactions on Starknet",
];

const PROTECTED = [
  "The claimant's identity: the contract stores only a commitment, never an address",
  "The payout credited to the claimant, settled into a shielded open note",
  "The claimant's balance and movements inside the STRK20 pool",
];

export default function ProofModelPage() {
  return (
    <>
      <SiteNav />
      <main className={styles.main}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>Proof model</p>
          <h1 className={styles.title}>Public proof, protected claimant</h1>
          <p className={styles.lede}>
            Nyalthe makes the parts that build trust public and keeps the part that should
            stay private protected. Anyone can verify a policy was funded and settled
            correctly, without learning who was paid.
          </p>
        </header>

        <section className={`${styles.section} ${styles.sectionTop}`}>
          <div className={styles.cols}>
            <article className={`${styles.panel} ${styles.panelOrange}`}>
              <p className={`${styles.panelKicker} ${styles.panelKickerOrange}`}>
                Public on-chain
              </p>
              <ul className={styles.list}>
                {PUBLIC.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className={styles.panel}>
              <p className={`${styles.panelKicker} ${styles.panelKickerMuted}`}>
                Protected
              </p>
              <ul className={`${styles.list} ${styles.listMuted}`}>
                {PROTECTED.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
          <p className={styles.note}>
            One honest edge: depositing into and withdrawing from the pool are visible
            on-chain. Nyalthe protects the claimant and their shielded receipt, not the fact
            that a privacy pool is being used.
          </p>
        </section>

        <section className={`${styles.section} ${styles.sectionTop}`}>
          <h2 className={styles.h2}>Two receipts</h2>
          <p className={styles.sectionLede}>
            Each claim produces two kinds of proof. A public proof anyone can read straight
            from the Nyalthe contract on Starknet, and a protected receipt only the claimant
            holds, so they can prove they were paid without revealing who they are.
          </p>
        </section>

        <div className={styles.cta}>
          <div className={styles.ctaInner}>
            <span className={styles.ctaText}>Follow a claim end to end.</span>
            <div className={styles.ctaActions}>
              <Link href="/app" className={styles.primary}>
                Open the app
              </Link>
              <Link href="/how-it-works" className={styles.secondary}>
                How it works
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

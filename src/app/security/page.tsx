import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "../components/site/SiteNav";
import Footer from "../components/site/Footer";
import styles from "../components/site/Subpage.module.css";

export const metadata: Metadata = {
  title: "Security · Nyalthe",
  description:
    "How the Nyalthe Cairo contract enforces safety: a pinned settlement pool, a one-way lifecycle, authority gates, and exact payout matching.",
};

const GUARANTEES = [
  {
    title: "Pinned settlement pool",
    text: "Settlement only runs when the caller is the STRK20 pool address set at deployment.",
  },
  {
    title: "One-way lifecycle",
    text: "Created, funded, event accepted, authorized, settled. Every step asserts the exact prior state.",
  },
  {
    title: "Events accepted once",
    text: "An event is accepted only from the funded state, so the same event cannot drive a second payout.",
  },
  {
    title: "Authority-gated events",
    text: "Only the event signer set at deployment can accept the event that authorizes a claim.",
  },
  {
    title: "Creator-gated actions",
    text: "Only the policy creator can fund the reserve or authorize the claim.",
  },
  {
    title: "Exact payout match",
    text: "Settlement reverts unless the amount moved equals the payout recorded in the policy.",
  },
];

const REVERTS = [
  { code: "NOT_PRIVACY_POOL", text: "Settlement was not called by the pinned STRK20 pool." },
  { code: "NOT_EVENT_AUTHORITY", text: "The event was not submitted by the configured signer." },
  { code: "NOT_CREATOR", text: "Funding or authorization was attempted by someone other than the creator." },
  { code: "INVALID_STATE", text: "The policy was not in the exact state the step requires." },
  { code: "EVENT_MISMATCH", text: "The submitted event did not match the policy's event id." },
  { code: "EXPIRY_IN_PAST", text: "The event arrived after expiry, or a policy was created already expired." },
  { code: "PAYOUT_MISMATCH", text: "The settled amount did not equal the recorded payout." },
  { code: "ZERO_CLAIMANT / ZERO_EVENT / ZERO_PAYOUT", text: "A policy cannot be created with an empty claimant, event, or payout." },
];

export default function SecurityPage() {
  return (
    <>
      <SiteNav />
      <main className={styles.main}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>Security</p>
          <h1 className={styles.title}>Guarantees enforced by the contract</h1>
          <p className={styles.lede}>
            Nyalthe's safety does not rest on good intentions. Each rule below is a check
            inside the Cairo contract, so a payout can only happen the way the policy was
            written.
          </p>
        </header>

        <section className={`${styles.section} ${styles.sectionTop}`}>
          <h2 className={styles.h2}>What the contract guarantees</h2>
          <div className={styles.grid}>
            {GUARANTEES.map((g) => (
              <article key={g.title} className={styles.card}>
                <div className={styles.cardHead}>
                  <span className={styles.marker} aria-hidden />
                  <h3 className={styles.cardTitle}>{g.title}</h3>
                </div>
                <p className={styles.cardText}>{g.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.sectionTop}`}>
          <h2 className={styles.h2}>Every guard is an assertion</h2>
          <p className={styles.sectionLede}>
            When a rule is broken the transaction reverts with a named reason. These are the
            checks the contract makes on the way to a payout.
          </p>
          <div className={styles.reverts}>
            {REVERTS.map((r) => (
              <div key={r.code} className={styles.revert}>
                <span className={styles.revertCode}>{r.code}</span>
                <span className={styles.revertText}>{r.text}</span>
              </div>
            ))}
          </div>
          <p className={styles.note}>
            Every guard is covered by an automated Cairo test suite, and the policy is
            deployed and exercised on Starknet Sepolia.
          </p>
        </section>

        <div className={styles.cta}>
          <div className={styles.ctaInner}>
            <span className={styles.ctaText}>Check the guarantees on-chain.</span>
            <div className={styles.ctaActions}>
              <Link href="/app" className={styles.primary}>
                Open the app
              </Link>
              <a href="/#evidence" className={styles.secondary}>
                See the on-chain evidence
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

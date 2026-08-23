import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "../components/site/SiteNav";
import Footer from "../components/site/Footer";
import styles from "../components/site/Subpage.module.css";

export const metadata: Metadata = {
  title: "How it works · Nyalthe",
  description:
    "The Nyalthe policy lifecycle on Starknet, from a funded reserve to a private payout, with every step proven on-chain.",
};

const STEPS = [
  {
    num: "01",
    title: "Create the policy",
    state: "CREATED",
    text: "The creator defines a claim: a commitment to the claimant, the event that triggers it, the payout, and an expiry. The contract stores only the commitment, never the claimant's address.",
  },
  {
    num: "02",
    title: "Fund the reserve",
    state: "FUNDED",
    text: "The creator locks the payout reserve for the policy. No claim can be authorized until the reserve is in place.",
  },
  {
    num: "03",
    title: "Verify the event",
    state: "EVENT_ACCEPTED",
    text: "The authorized event signer submits the matching event before expiry. A wrong signer, a mismatched event, or a late submission is rejected on-chain.",
  },
  {
    num: "04",
    title: "Authorize the claim",
    state: "CLAIM_AUTHORIZED",
    text: "With the event accepted, the creator authorizes the payout for the committed claimant.",
  },
  {
    num: "05",
    title: "Settle privately",
    state: "SETTLED",
    text: "The STRK20 pool calls the contract, which checks the reserve equals the payout and fills an open note. The payout lands as a shielded note for the claimant in the pool.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <SiteNav />
      <main className={styles.main}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>How it works</p>
          <h1 className={styles.title}>From a funded policy to a private payout</h1>
          <p className={styles.lede}>
            Nyalthe runs one event-triggered relief payout as a strict on-chain state
            machine. Each step below is a real transaction, and the payout only settles the
            way the policy was written.
          </p>
        </header>

        <section className={`${styles.section} ${styles.sectionTop}`}>
          <h2 className={styles.h2}>The lifecycle</h2>
          <p className={styles.sectionLede}>
            A policy moves forward one state at a time. It can never skip a step or move
            backward.
          </p>
          <div className={styles.steps}>
            {STEPS.map((s) => (
              <div key={s.num} className={styles.step}>
                <div className={styles.stepNum}>{s.num}</div>
                <div>
                  <div className={styles.stepTitleRow}>
                    <span className={styles.stepTitle}>{s.title}</span>
                    <span className={styles.stepState}>{s.state}</span>
                  </div>
                  <p className={styles.stepText}>{s.text}</p>
                </div>
              </div>
            ))}
          </div>
          <p className={styles.note}>
            If the event never arrives, a funded policy can be expired after its deadline
            (state EXPIRED) so the reserve is never stuck.
          </p>
        </section>

        <section className={`${styles.section} ${styles.sectionTop}`}>
          <h2 className={styles.h2}>What is proven</h2>
          <p className={styles.sectionLede}>
            Every transition emits an event on Starknet, PolicyCreated, EventAccepted,
            ClaimAuthorized, ClaimSettled, or PolicyExpired, so anyone can reconstruct a
            policy's full history from the chain. The real transactions for the live policy
            are on the landing page.
          </p>
        </section>

        <div className={styles.cta}>
          <div className={styles.ctaInner}>
            <span className={styles.ctaText}>See a real policy settle.</span>
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

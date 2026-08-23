import styles from "./TrustBoundary.module.css";

export default function TrustBoundary() {
  return (
    <section id="trust" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <p className={styles.eyebrow}>Trust boundary</p>
          <h2 className={styles.h2}>One assumption, stated plainly</h2>
          <p className={styles.intro}>
            Nyalthe is deliberate about what a smart contract can and cannot know. The
            payout lifecycle is enforced on-chain. The fact that the real-world event
            actually happened is asserted by a signed event source. That single handoff is
            the trust boundary.
          </p>
        </div>

        <div className={styles.flow}>
          <div className={styles.node}>
            <span className={styles.nodeTag}>Off-chain</span>
            <h3 className={styles.nodeTitle}>Signed event source</h3>
            <p className={styles.nodeText}>
              An authorized signer attests that the real-world event occurred, then signs
              the event record.
            </p>
            <p className={styles.trustLine}>You trust this signer.</p>
          </div>

          <div className={styles.divider} aria-hidden>
            <span className={styles.badge} />
          </div>

          <div className={`${styles.node} ${styles.onchainNode}`}>
            <span className={`${styles.nodeTag} ${styles.onchain}`}>On-chain</span>
            <h3 className={styles.nodeTitle}>Nyalthe contract</h3>
            <p className={styles.nodeText}>
              Verifies the signer, rejects replays, and drives the policy through funding,
              authorization, and settlement.
            </p>
            <p className={styles.trustLine}>Enforced by code on Starknet.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

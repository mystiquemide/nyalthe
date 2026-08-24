import styles from "./PrivateByDesign.module.css";

const PROTECTED = [
  "The claimant's identity and receiving address",
  "The link between the claimant and their payout",
  "Movement of funds inside the privacy pool",
];

const PUBLIC = [
  "Policy terms and the funded reserve",
  "The accepted event record and its replay protection",
  "Contract logic and each settlement state change",
];

export default function PrivateByDesign() {
  return (
    <section id="privacy" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <p className={styles.eyebrow}>Private by design</p>
          <h2 className={styles.h2}>What stays protected, and what stays public</h2>
          <p className={styles.intro}>
            Nyalthe does not hide the parts that make a claim trustworthy. The policy, the
            event that triggers it, and the settlement logic are all verifiable on Starknet.
            What stays private is the part that should: who receives the payout.
          </p>
        </div>

        <div className={styles.grid}>
          <article className={`${styles.panel} ${styles.protected}`}>
            <p className={styles.kicker}>Protected</p>
            <h3 className={styles.panelTitle}>Kept private in the STRK20 pool</h3>
            <ul className={styles.list}>
              {PROTECTED.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className={`${styles.panel} ${styles.public}`}>
            <p className={styles.kicker}>Public on-chain</p>
            <h3 className={styles.panelTitle}>Open for anyone to verify</h3>
            <ul className={styles.list}>
              {PUBLIC.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>

        <p className={styles.note}>
          One honest edge: depositing into and withdrawing from the pool are visible
          on-chain. Nyalthe protects the claimant and their receipt, not the fact that a
          privacy pool is being used.
        </p>
      </div>
    </section>
  );
}

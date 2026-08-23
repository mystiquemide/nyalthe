import styles from "./ProofModel.module.css";

const PUBLIC_ROWS = [
  { k: "Network", v: "Starknet Sepolia" },
  { k: "Contract", v: "0x0742…2a19" },
  { k: "Policy", v: "#1" },
  { k: "Event", v: "weather-active" },
];

const PROTECTED_ROWS = [
  { k: "Claimant", v: "•••••••••", shield: true },
  { k: "Payout amount", v: "••• STRK", shield: true },
  { k: "Settlement", v: "Open note in pool", shield: false },
  { k: "Proof held by", v: "Claimant", shield: false },
];

export default function ProofModel() {
  return (
    <section id="proof" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <p className={styles.eyebrow}>Proof model</p>
          <h2 className={styles.h2}>Public proof, protected receipt</h2>
          <p className={styles.intro}>
            Every claim produces two kinds of proof. Anyone can verify that a policy was
            funded and settled correctly on Starknet. Only the claimant can prove they
            received the payout, and neither their identity nor the amount is exposed.
          </p>
        </div>

        <div className={styles.grid}>
          <article className={`${styles.card} ${styles.publicCard}`}>
            <header className={styles.cardHead}>
              <span className={styles.cardLabel}>Public proof</span>
              <span className={`${styles.tag} ${styles.tagPublic}`}>Anyone can verify</span>
            </header>
            <dl className={styles.rows}>
              {PUBLIC_ROWS.map((r) => (
                <div key={r.k} className={styles.row}>
                  <dt className={styles.k}>{r.k}</dt>
                  <dd className={styles.v}>{r.v}</dd>
                </div>
              ))}
            </dl>
            <p className={styles.foot}>Read straight from the Nyalthe contract on Starknet.</p>
          </article>

          <article className={`${styles.card} ${styles.protectedCard}`}>
            <header className={styles.cardHead}>
              <span className={styles.cardLabel}>Protected receipt</span>
              <span className={`${styles.tag} ${styles.tagProtected}`}>Claimant only</span>
            </header>
            <dl className={styles.rows}>
              {PROTECTED_ROWS.map((r) => (
                <div key={r.k} className={styles.row}>
                  <dt className={styles.k}>{r.k}</dt>
                  <dd className={`${styles.v} ${r.shield ? styles.shield : ""}`}>{r.v}</dd>
                </div>
              ))}
            </dl>
            <p className={styles.foot}>Settled into an open note in the STRK20 privacy pool.</p>
          </article>
        </div>
      </div>
    </section>
  );
}

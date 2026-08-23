import styles from "./Security.module.css";

const GUARANTEES = [
  {
    title: "Pinned settlement pool",
    text: "Settlement only executes when the caller is the official STRK20 pool address set at deployment.",
  },
  {
    title: "One-way lifecycle",
    text: "A policy moves from created to funded, event accepted, authorized, then settled. Every step checks the exact prior state.",
  },
  {
    title: "Events accepted once",
    text: "An event is accepted only from the funded state, so the same event cannot be replayed into a second payout.",
  },
  {
    title: "Authority-gated triggers",
    text: "Only the event authority set at deployment can submit the event that authorizes a claim.",
  },
  {
    title: "Funded before authorized",
    text: "A policy must hold its reserve before its event is accepted or a claim is authorized.",
  },
  {
    title: "Exact payout match",
    text: "Settlement reverts unless the amount moved equals the policy payout recorded on-chain.",
  },
];

export default function Security() {
  return (
    <section id="security" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <p className={styles.eyebrow}>Security</p>
          <h2 className={styles.h2}>Guarantees enforced by the contract</h2>
          <p className={styles.intro}>
            Nyalthe's safety does not rest on good intentions. Each of these rules is a
            check inside the Cairo contract, so a payout can only happen the way the policy
            was written.
          </p>
        </div>

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

        <p className={styles.foot}>
          Every transition is guarded by explicit state checks and covered by the
          contract's Cairo test suite, with the policy deployed and exercised on Starknet
          Sepolia.
        </p>
      </div>
    </section>
  );
}

import styles from "./OnChainEvidence.module.css";

const EXPLORER = "https://sepolia.starkscan.co";
const CONTRACT =
  "0x07426e95949ac5bdc723237952e0a344c333ea4adb5968ea8a65b2b517a42a19";

const STEPS = [
  {
    name: "Create policy",
    hash: "0x03450f813833f7fae886733ddebce1bb04bdc57643c53ffd7a54bb3ba1198767",
    block: "13863925",
    note: "Policy #1 opened for event weather-active.",
  },
  {
    name: "Fund reserve",
    hash: "0x05bc205d591ee33d46323aa5750743a6da2bebd961d11ee53255107863560a2c",
    block: "13863930",
    note: "The payout reserve is locked for the policy.",
  },
  {
    name: "Accept event",
    hash: "0x024a931c1b564e8eb13daa7888cfb8eaaa4f282e54156968517fee3d2d401019",
    block: "13863934",
    note: "The authorized signer submitted the event record.",
  },
  {
    name: "Authorize claim",
    hash: "0x047fa503bfedbbc2a9b7091f6eb24840edff34dfb662f953f4334cd15ce90a48",
    block: "13863939",
    note: "The contract authorized the eligible claimant.",
  },
  {
    name: "Settle privately",
    hash: "0x0283f9731387e31606acfc94650d868033ae6c5ca96913dedb29ef6f258d97a8",
    block: "13880350",
    note: "Routed through STRK20. An open note is deposited, so the claimant stays protected.",
    settle: true,
  },
];

function short(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

export default function OnChainEvidence() {
  return (
    <section id="evidence" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <p className={styles.eyebrow}>On-chain evidence</p>
          <h2 className={styles.h2}>Real transactions, not a demo</h2>
          <p className={styles.intro}>
            Nothing here is mocked. This is Nyalthe policy #1 on Starknet Sepolia, taken
            from creation to a private settlement. Every hash is live on-chain and opens in
            the block explorer.
          </p>
        </div>

        <div className={styles.contract}>
          <div>
            <span className={styles.contractLabel}>Contract</span>
            <a
              className={styles.contractAddr}
              href={`${EXPLORER}/contract/${CONTRACT}`}
              target="_blank"
              rel="noreferrer"
            >
              {CONTRACT}
            </a>
          </div>
          <span className={styles.net}>Starknet Sepolia</span>
        </div>

        <ol className={styles.timeline}>
          {STEPS.map((s) => (
            <li
              key={s.hash}
              className={`${styles.step} ${s.settle ? styles.settle : ""}`}
            >
              <span className={styles.node} aria-hidden />
              <div className={styles.stepBody}>
                <div className={styles.stepTop}>
                  <span className={styles.stepName}>{s.name}</span>
                  <span className={styles.block}>Block {s.block}</span>
                </div>
                <a
                  className={styles.hash}
                  href={`${EXPLORER}/tx/${s.hash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {short(s.hash)}
                </a>
                <p className={styles.stepNote}>{s.note}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

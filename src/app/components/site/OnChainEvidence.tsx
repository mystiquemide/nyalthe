import styles from "./OnChainEvidence.module.css";

const EXPLORER = "https://starkscan.co";
const CONTRACT =
  "0x01f929480b99cb165550086e495036381166d63041773a60a055dff2fc51f687";

const STEPS = [
  {
    name: "Deploy contract",
    hash: "0x0309d23b110ad8c0cd8d557a4a8c1f3ec9baf8cc8a832558b6e69526520b9a3e",
    block: "14469458",
    note: "The Nyalthe contract goes live on Starknet mainnet, pinned to the STRK20 pool.",
  },
  {
    name: "Create policy",
    hash: "0x009dde7bc3816ddaa4350679004578b3d57a99f97c29342ff63f4ccc0a042350",
    block: "14469536",
    note: "Policy #1 opened for event weather-main, payout 1 STRK.",
  },
  {
    name: "Fund reserve",
    hash: "0x016c7bf4a6adb8639ee1c67ee91004b91e851b0762949b202c192ac7a988dfee",
    block: "14469543",
    note: "The policy is marked funded, locking the payout path.",
  },
  {
    name: "Accept event",
    hash: "0x060bd0bcfd5a927f36a41267bd99b393b51339df1167a631fdcf44c136b26498",
    block: "14469548",
    note: "The authorized event authority submits the weather-main event record.",
  },
  {
    name: "Authorize claim",
    hash: "0x019ecc2a0074fe53e7ef659ae347d4b09888a558860d87ff20ec21edd637c038",
    block: "14469553",
    note: "The contract authorizes the claim. The claimant can now settle privately.",
  },
  {
    name: "Fund through the pool",
    hash: "0x12c5bfe20b8bd8c0c0a138ea227185a2e8eb1392c83c0af71bada2e1cc0c6e1",
    block: "14472845",
    note: "A private withdrawal routes the 1 STRK payout from the pool into the contract.",
  },
  {
    name: "Settle privately",
    hash: "0x6a3fd555fa1adaf7e42138958ca5b31dc39c1f78f45c98026e3ad6debb07697",
    block: "14475821",
    note: "Through STRK20: an open note is deposited for the claimant and the contract settles. Policy #1 is SETTLED.",
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
            Nothing here is mocked. This is Nyalthe policy #1 on Starknet mainnet, taken
            from deployment to a private settlement through the STRK20 pool. Every hash
            is live on-chain and opens in the block explorer.
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
          <span className={styles.net}>Starknet mainnet</span>
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

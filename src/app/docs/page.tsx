import type { Metadata } from "next";
import Link from "next/link";
import styles from "./docs.module.css";

export const metadata: Metadata = {
  title: "Docs · Nyalthe",
  description:
    "Nyalthe product documentation: live deployment, contract reference, revert codes, STRK20 settlement, and running locally.",
};

const DEPLOYMENT = [
  ["network", "Starknet mainnet (SN_MAIN)"],
  ["contract", "0x01f929480b99cb165550086e495036381166d63041773a60a055dff2fc51f687"],
  ["class hash", "0x073a3eb3964394234924c7b3ee0c13bd2b7fc4a5e195b3c83b61807ba2345a86"],
  ["STRK20 pool", "0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a"],
  ["STRK token", "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"],
  ["live policy", "#2 · weather-main-2 · 1 STRK · SETTLED"],
];

const ENTRY_POINTS = [
  { fn: "create_policy", caller: "any", effect: "Registers a commitment to the claimant, the trigger event, the payout, and an expiry. Returns the policy id. State: CREATED." },
  { fn: "fund_policy", caller: "creator", effect: "Marks the reserve as locked. The contract must hold the payout in STRK before the event can be accepted. State: FUNDED." },
  { fn: "accept_event", caller: "authority", effect: "The event authority submits the matching event before expiry. Replay is blocked: the same event cannot drive a second payout. State: EVENT_ACCEPTED." },
  { fn: "authorize_claim", caller: "creator", effect: "Authorizes the payout for the committed claimant. State: CLAIM_AUTHORIZED." },
  { fn: "privacy_invoke", caller: "pool", effect: "Only the pinned STRK20 pool can call it. Settle verifies the contract's STRK balance equals the policy payout exactly, approves the pool, and returns an open-note deposit. State: SETTLED." },
  { fn: "expire_policy", caller: "any", effect: "After the expiry timestamp, anyone can mark a funded-but-untriggered policy EXPIRED. State: EXPIRED." },
  { fn: "get_policy / get_event_authority", caller: "view", effect: "Reads the full policy record and the configured authority." },
];

const REVERTS = [
  ["NOT_PRIVACY_POOL", "Settlement was attempted by an address other than the pinned STRK20 pool."],
  ["NOT_EVENT_AUTHORITY", "The event was not submitted by the authority configured at deployment."],
  ["NOT_CREATOR", "Funding or authorization was attempted by someone other than the policy creator."],
  ["INVALID_STATE", "The policy was not in the exact prior state this step requires."],
  ["EVENT_MISMATCH", "The submitted event id did not match the policy's recorded event."],
  ["EXPIRY_IN_PAST", "The event arrived after expiry, or a policy was created already expired."],
  ["PAYOUT_MISMATCH", "The contract's STRK balance did not equal the recorded payout at settlement."],
  ["PAYOUT_OVERFLOW", "The contract's balance exceeded the u128 payout range."],
  ["ZERO_CLAIMANT / ZERO_EVENT / ZERO_PAYOUT", "A policy cannot be created with an empty claimant commitment, event, or payout."],
];

const SETTLEMENT_STEPS = [
  ["1", "Shield STRK into the privacy pool from a Wallet API >= 0.10.3 wallet (Ready X). Every pool operation pays a 6 STRK privacy fee plus gas."],
  ["2", "Fund the reserve: either a public 1 STRK transfer to the contract (one pool op at settlement), or a private pool withdrawal to the contract (two pool ops)."],
  ["3", "Settle: the wallet builds an OPEN transfer for the claimant plus an invoke on Nyalthe; the pool calls privacy_invoke(Settle), the payout lands as an open note, and the policy flips to SETTLED."],
];

function callerTag(caller: string) {
  if (caller === "pool") return <span className={`${styles.tag} ${styles.tagPool}`}>STRK20 pool only</span>;
  if (caller === "authority") return <span className={`${styles.tag} ${styles.tagAuth}`}>event authority</span>;
  if (caller === "creator") return <span className={`${styles.tag} ${styles.tagAuth}`}>policy creator</span>;
  if (caller === "view") return <span className={`${styles.tag} ${styles.tagAny}`}>view</span>;
  return <span className={`${styles.tag} ${styles.tagAny}`}>anyone</span>;
}

export default function DocsPage() {
  return (
    <main className={styles.shell}>
      <header className={styles.hdr}>
        <Link href="/" className={styles.hdrBrand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.svg" alt="" className={styles.hdrLogo} />
          Nyalthe
        </Link>
        <span className={styles.hdrPath}>/ docs</span>
        <nav className={styles.hdrNav}>
          <Link href="/app" className={styles.hdrLink}>App</Link>
          <Link href="/docs" className={`${styles.hdrLink} ${styles.hdrLinkOn}`}>Docs</Link>
          <a
            href="https://github.com/mystiquemide/nyalthe"
            target="_blank"
            rel="noreferrer"
            className={styles.hdrLink}
          >
            GitHub ↗
          </a>
        </nav>
      </header>

      <div className={styles.body}>
        <nav className={styles.toc} aria-label="Docs">
          <div className={styles.tocSect}>Getting started</div>
          <a className={styles.tocLink} href="#overview">Overview</a>
          <a className={styles.tocLink} href="#deployment">Live deployment</a>
          <a className={styles.tocLink} href="#run">Run locally</a>
          <div className={styles.tocSect}>Protocol</div>
          <a className={styles.tocLink} href="#lifecycle">Policy lifecycle</a>
          <a className={styles.tocLink} href="#trigger">The trigger, verbatim</a>
          <a className={styles.tocLink} href="#reference">Contract reference</a>
          <a className={styles.tocLink} href="#reverts">Revert codes</a>
          <div className={styles.tocSect}>Integration</div>
          <a className={styles.tocLink} href="#settlement">STRK20 settlement</a>
          <div className={styles.tocSect}>Trust &amp; limits</div>
          <a className={styles.tocLink} href="#trust">Trust model</a>
          <a className={styles.tocLink} href="#privacy">What is private</a>
        </nav>

        <div className={styles.main}>
          <h2 id="overview" className={styles.h2}>Overview</h2>
          <p className={styles.lede}>
            Nyalthe is a privacy-preserving parametric claims rail on Starknet. A funded
            event policy settles a payout to a protected claimant through the STRK20
            privacy pool, while the policy, the accepted event, the contract, and the
            settlement stay verifiable by anyone.
          </p>
          <div className={styles.code}>
            create_policy → fund_policy → accept_event → authorize_claim → privacy_invoke(Settle)
          </div>
          <p className={styles.p}>
            Two policies have run this full lifecycle on Starknet mainnet. Every step is
            a real transaction; the workspace and the{" "}
            <a className={styles.link} href="https://nyalthe.vercel.app/app">claim workspace</a>{" "}
            read the live contract state directly.
          </p>

          <h2 id="deployment" className={styles.h2}>Live deployment</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <tbody>
                {DEPLOYMENT.map(([k, v]) => (
                  <tr key={k}>
                    <td>{k}</td>
                    <td className={styles.mono}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 id="run" className={styles.h2}>Run locally</h2>
          <div className={styles.code}>
{`npm install
npm run build       # Next.js app
npm test            # settlement action-builder tests

cd cairo
scarb build         # Cairo contract
snforge test        # contract test suite (6 tests)`}
          </div>
          <p className={styles.p}>
            Copy <span className={styles.mono}>.env.example</span> to{" "}
            <span className={styles.mono}>.env.local</span> and set{" "}
            <span className={styles.mono}>NEXT_PUBLIC_PROVIDER_URL</span> (an Alchemy key)
            for a dedicated RPC; without it the app falls back to a public RPC.
          </p>

          <h2 id="lifecycle" className={styles.h2}>Policy lifecycle</h2>
          <p className={styles.p}>
            The lifecycle is a strict one-way state machine. Every transition asserts the
            exact prior state; nothing skips, nothing runs backward, and settled and
            expired are terminal.
          </p>
          <div className={styles.code}>
{`CREATED → FUNDED → EVENT_ACCEPTED → CLAIM_AUTHORIZED → SETTLED
                ↘ (after expiry) EXPIRED`}
          </div>

          <h2 id="trigger" className={styles.h2}>The trigger, verbatim</h2>
          <p className={styles.p}>
            The event adapter is a trust boundary. What the contract enforces is below,
            quoted from the Cairo source, then decoded.
          </p>
          <div className={styles.code}>
{`assert(caller == self.event_authority.read())   // NOT_EVENT_AUTHORITY
assert(policy.event_id == event_id)              // EVENT_MISMATCH
assert(policy.state == FUNDED)                   // INVALID_STATE
assert(get_block_timestamp() <= policy.expiry)   // EXPIRY_IN_PAST`}
          </div>
          <div className={styles.decodeCard}>
            <div className={styles.decodeQuote}>caller == event_authority</div>
            <div className={styles.decodePlain}>
              Only the authority address pinned at deployment can submit the event.
            </div>
          </div>
          <div className={styles.decodeCard}>
            <div className={styles.decodeQuote}>policy.event_id == event_id</div>
            <div className={styles.decodePlain}>
              The submitted event must match the policy's recorded event, byte for byte.
            </div>
          </div>
          <div className={styles.decodeCard}>
            <div className={styles.decodeQuote}>state == FUNDED && timestamp &lt;= expiry</div>
            <div className={styles.decodePlain}>
              The reserve must already be locked and the event must arrive before expiry.
              Whether the real-world event happened is asserted by the signed event
              source - that single handoff is the trust boundary, stated plainly.
            </div>
          </div>

          <h2 id="reference" className={styles.h2}>Contract reference</h2>
          <p className={styles.p}>Entry points and who may call them:</p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>function</th>
                  <th>caller</th>
                  <th>effect</th>
                </tr>
              </thead>
              <tbody>
                {ENTRY_POINTS.map((e) => (
                  <tr key={e.fn}>
                    <td>{e.fn}</td>
                    <td>{callerTag(e.caller)}</td>
                    <td>{e.effect}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 id="reverts" className={styles.h2}>Revert codes</h2>
          <p className={styles.p}>
            Every guard is a named assertion. When a rule is broken, the transaction
            reverts with the reason - these are the product's vocabulary, surfaced in
            the workspace receipts.
          </p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <tbody>
                {REVERTS.map(([code, meaning]) => (
                  <tr key={code}>
                    <td>{code}</td>
                    <td>{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 id="settlement" className={styles.h2}>STRK20 settlement</h2>
          <p className={styles.p}>
            Settlement runs inside the STRK20 privacy pool: the wallet withdraws or
            transfers the payout, the pool calls <span className={styles.mono}>privacy_invoke</span>{" "}
            on Nyalthe, the contract verifies the exact payout match, and the claimant
            receives a shielded open note. Only the claimant can prove they were paid.
          </p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <tbody>
                {SETTLEMENT_STEPS.map(([n, text]) => (
                  <tr key={n}>
                    <td>{n}</td>
                    <td>{text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.note}>
            Cost model, measured on mainnet: every STRK20 pool operation (shield,
            withdraw, settle) pays a 6 STRK privacy fee plus roughly 2.4-2.7 STRK gas.
            The workspace quotes this before you commit.
          </p>

          <h2 id="trust" className={styles.h2}>Trust model</h2>
          <p className={styles.p}>
            The contract verifies that the event came from the authorized event authority
            and that the same event cannot be replayed. Whether the real-world event
            actually happened is asserted by the signed event source. On the live
            policy, the creator, funder, and event authority are the same deployer
            address - visible on Starkscan - so the trust boundary is fully inspectable.
          </p>

          <h2 id="privacy" className={styles.h2}>What is private</h2>
          <p className={styles.p}>
            The claimant's identity is never stored - only a commitment. The payout lands
            in an open note inside the pool; movement of funds inside the pool is
            private. One honest edge: deposits into and withdrawals from the pool are
            visible on-chain. Nyalthe protects the claimant and their receipt, not the
            fact that a privacy pool is being used.
          </p>
        </div>
      </div>
    </main>
  );
}

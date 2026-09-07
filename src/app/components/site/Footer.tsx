import Link from "next/link";
import styles from "./Footer.module.css";

const CONTRACT =
  "0x01f929480b99cb165550086e495036381166d63041773a60a055dff2fc51f687";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <div className={styles.brandRow}>
              <img
                src="/logo-mark.svg"
                alt=""
                width={26}
                height={26}
                className={styles.mark}
              />
              <span className={styles.name}>Nyalthe</span>
            </div>
            <p className={styles.tagline}>
              Public proof for private claims on Starknet.
            </p>
          </div>

          <nav className={styles.cols} aria-label="Footer">
            <div className={styles.col}>
              <p className={styles.colTitle}>Explore</p>
              <Link href="/how-it-works">How it works</Link>
              <Link href="/proof-model">Proof model</Link>
              <a href="/#trust">Trust boundary</a>
              <Link href="/security">Security</Link>
              <a href="/#evidence">On-chain evidence</a>
            </div>
            <div className={styles.col}>
              <p className={styles.colTitle}>Build</p>
              <Link href="/app">Open the app</Link>
              <a
                href="https://github.com/mystiquemide/nyalthe"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
              <a
                href={`https://starkscan.co/contract/${CONTRACT}`}
                target="_blank"
                rel="noreferrer"
              >
                Contract
              </a>
              <a
                href="https://github.com/mystiquemide/nyalthe/blob/main/strk20.json"
                target="_blank"
                rel="noreferrer"
              >
                Submission evidence
              </a>
            </div>
          </nav>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copy}>© 2026 Nyalthe</p>
          <p className={styles.note}>
            Starknet mainnet, live through the STRK20 privacy pool. Built for the STRK20
            Private Sprint.
          </p>
        </div>
      </div>
    </footer>
  );
}

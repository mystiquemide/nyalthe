import type { Metadata } from "next";
import Link from "next/link";
import ClaimWorkspace from "../components/client/WalletHandle/ClaimWorkspace";
import SelectWallet from "../components/client/WalletHandle/SelectWallet";
import styles from "./app.module.css";

export const metadata: Metadata = {
  title: "Claim workspace · Nyalthe",
  description:
    "Inspect a policy on Starknet and settle an authorized claim privately through the STRK20 privacy pool.",
};

export default function AppPage() {
  return (
    <main className={styles.shell}>
      <header className={styles.hdr}>
        <Link href="/" className={styles.hdrBrand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.svg" alt="" className={styles.hdrLogo} />
          Nyalthe
        </Link>
        <span className={styles.netPill}>
          <span className={styles.netDot} />
          mainnet
        </span>
        <nav className={styles.hdrNav}>
          <Link href="/app" className={`${styles.hdrLink} ${styles.hdrLinkOn}`}>
            App
          </Link>
          <Link href="/docs" className={styles.hdrLink}>
            Docs
          </Link>
          <a
            href="https://github.com/mystiquemide/nyalthe"
            target="_blank"
            rel="noreferrer"
            className={styles.hdrLink}
          >
            GitHub ↗
          </a>
          <SelectWallet variant="nav" />
        </nav>
      </header>
      <div className={styles.body}>
        <div className={styles.main}>
          <ClaimWorkspace />
        </div>
      </div>
    </main>
  );
}

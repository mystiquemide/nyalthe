import type { Metadata } from "next";
import SiteNav from "../components/site/SiteNav";
import ClaimWorkspace from "../components/client/WalletHandle/ClaimWorkspace";
import styles from "./app.module.css";

export const metadata: Metadata = {
  title: "Claim workspace · Nyalthe",
  description:
    "Inspect a policy on Starknet and settle an authorized claim privately through the STRK20 privacy pool.",
};

export default function AppPage() {
  return (
    <>
      <SiteNav />
      <main className={styles.main}>
        <div className={styles.inner}>
          <header className={styles.head}>
            <p className={styles.eyebrow}>Claim workspace</p>
            <h1 className={styles.title}>Settle an authorized claim, privately</h1>
            <p className={styles.sub}>
              The policy below is read live from the Nyalthe contract on Starknet.
              Connect a privacy-enabled wallet to move the payout through the STRK20
              pool and settle it into an open note, so the claimant stays protected.
            </p>
          </header>
          <ClaimWorkspace />
        </div>
      </main>
    </>
  );
}

import type { Metadata } from "next";
import SiteNav from "../components/site/SiteNav";
import WalletAccountV6Tag from "../components/client/WalletHandle/WalletAccountV6Tag";
import styles from "./app.module.css";

export const metadata: Metadata = {
  title: "Claim workspace · Nyalthe",
  description:
    "Connect a Starknet wallet to inspect a policy and settle an authorized claim privately.",
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
              Connect a Starknet wallet to read the policy on-chain and complete the
              protected payout through the STRK20 privacy pool.
            </p>
          </header>
          <WalletAccountV6Tag />
        </div>
      </main>
    </>
  );
}

"use client";

import { useState } from "react";
import { num } from "starknet";
import type { WALLET_API } from "@starknet-io/types-js";
import styles from "../../../uni.module.css";
import * as constants from "@/utils/constants";
import { useStoreWallet } from "../../Wallet/walletContext";
import { useFrontendProvider } from "../provider/providerContext";
import { StrkCoin } from "../../TokenIcons";
import SelectWallet from "./SelectWallet";

const TOKEN = constants.addrSTRK;
const RESERVE_AMOUNT = 2n * 10n ** 18n;
const PAYOUT_AMOUNT = 1n * 10n ** 18n;

type ResultRow = { label: string; value: string; hash?: string };
type ActionResult = { status: "pending" | "ok" | "error"; title: string; rows?: ResultRow[]; note?: string };

function shortHex(value: string): string {
  const hex = num.toHex(value);
  return hex.length <= 13 ? hex : `${hex.slice(0, 7)}...${hex.slice(-4)}`;
}

function fmtStrk(value: bigint): string {
  const whole = value / 10n ** 18n;
  const fraction = (value % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : `${whole}`;
}

function errorResult(message: string): ActionResult {
  return { status: "error", title: "Action failed", note: message };
}

function receiptResult(receipt: any, txHash: string, amount: string): ActionResult {
  const rawReceipt = receipt?.value ?? receipt;
  const reverted = rawReceipt?.execution_status === "REVERTED";
  const fee = rawReceipt?.actual_fee?.amount ?? rawReceipt?.actual_fee;
  const rows: ResultRow[] = [{ label: "Amount", value: amount }, { label: "Transaction", value: shortHex(txHash), hash: txHash }];
  if (fee !== undefined) {
    try { rows.splice(1, 0, { label: "Network fee", value: `${fmtStrk(num.toBigInt(fee))} STRK` }); } catch { /* keep receipt useful */ }
  }
  return { status: reverted ? "error" : "ok", title: reverted ? "Transaction reverted" : "Transaction confirmed", rows };
}

export default function WalletAccountV6Tag() {
  const providerIndex = useFrontendProvider((state) => state.currentFrontendProviderIndex);
  const wallet = useStoreWallet((state) => state.myWalletAccount);
  const address = useStoreWallet((state) => state.address);
  const connected = useStoreWallet((state) => state.isConnected);
  const networkName = constants.Strk20Networks[providerIndex];
  const supported = Boolean(networkName);
  const [tab, setTab] = useState<"reserve" | "payout" | "balances">("reserve");
  const [result, setResult] = useState<ActionResult | null>(null);

  async function submit(actions: WALLET_API.STRK20_ACTION[], amount: string) {
    setResult(null);
    if (!wallet) return setResult(errorResult("Connect a privacy-enabled Starknet wallet first."));
    if (!supported) return setResult(errorResult("Switch to Starknet Mainnet or Sepolia."));
    let txHash: string;
    try {
      txHash = (await wallet.strk20InvokeTransaction(actions)).transaction_hash;
    } catch (error: any) {
      return setResult(errorResult(error?.message ?? String(error)));
    }
    setResult({ status: "pending", title: "Awaiting Starknet finality", rows: [{ label: "Amount", value: amount }, { label: "Transaction", value: shortHex(txHash), hash: txHash }] });
    try {
      const receipt = await constants.myFrontendProviders[providerIndex].waitForTransaction(txHash, { retries: 400, retryInterval: 3000 });
      setResult(receiptResult(receipt, txHash, amount));
    } catch (error: any) {
      setResult({ status: "error", title: "Could not confirm transaction", rows: [{ label: "Transaction", value: shortHex(txHash), hash: txHash }], note: error?.message ?? String(error) });
    }
  }

  async function fundReserve() {
    await submit([{ type: "deposit", token: TOKEN, amount: num.toHex(RESERVE_AMOUNT) }], "2 STRK reserve");
  }

  async function settlePayout() {
    if (!constants.claimantAddress) return setResult(errorResult("Set NEXT_PUBLIC_CLAIMANT_ADDRESS before settling the protected claimant payout."));
    await submit([{ type: "transfer", token: TOKEN, amount: num.toHex(PAYOUT_AMOUNT), recipient: constants.claimantAddress }], "1 STRK protected payout");
  }

  async function readBalances() {
    setResult(null);
    if (!wallet) return setResult(errorResult("Connect a privacy-enabled Starknet wallet first."));
    try {
      const balances: any = await wallet.strk20Balances([]);
      const list = Array.isArray(balances?.value ?? balances) ? (balances?.value ?? balances) : [];
      setResult({ status: "ok", title: "Shielded balance read", rows: list.length ? list.map((entry: any) => ({ label: shortHex(entry.token ?? entry[0]), value: String(entry.amount ?? entry[1]) })) : undefined, note: list.length ? undefined : "No shielded balances found." });
    } catch (error: any) {
      setResult(errorResult(error?.message ?? String(error)));
    }
  }

  const action = tab === "reserve" ? fundReserve : tab === "payout" ? settlePayout : readBalances;
  const label = tab === "reserve" ? "Fund policy reserve" : tab === "payout" ? "Settle protected payout" : "Read shielded balance";

  return (
    <div className={styles.panel}>
      <div className={styles.tabs}>
        {(["reserve", "payout", "balances"] as const).map((key) => (
          <button key={key} className={`${styles.tab} ${tab === key ? styles.tabActive : ""}`} onClick={() => { setTab(key); setResult(null); }}>
            {key === "reserve" ? "Reserve" : key === "payout" ? "Private payout" : "Balance"}
          </button>
        ))}
      </div>
      <div className={styles.inputBlock}>
        <div className={styles.inputLabel}>{tab === "reserve" ? "Public policy funding" : tab === "payout" ? "Protected claimant settlement" : "Private pool state"}</div>
        <div className={styles.inputMain}>
          <div className={styles.bigValue}>{tab === "balances" ? "--" : tab === "reserve" ? "2" : "1"}</div>
          <span className={styles.tokenPill}><span className={styles.tokenDot}><StrkCoin size={22} /></span>{tab === "balances" ? "STRK20" : "STRK"}</span>
        </div>
        <div className={styles.subLine}><span>{tab === "reserve" ? "Deposit into the STRK20 reserve" : tab === "payout" ? "Recipient and amount stay protected inside the pool" : "Read notes held by the connected wallet"}</span><span className={styles.subMono}>{address ? shortHex(address) : "wallet required"}</span></div>
      </div>
      <div className={styles.feeRow}><span>Network</span><span className={`${styles.feeVal} ${supported ? styles.netOk : styles.netBad}`}>{networkName ?? "Unsupported"}</span></div>
      <div className={styles.warn}>Public proof: policy funding, event status, contract, and settlement hash. Protected: claimant identity and payout amount.</div>
      {connected ? <button className={styles.btnCta} disabled={!supported} onClick={action}>{label}</button> : <SelectWallet variant="ctaBig" />}
      {result ? <div className={`${styles.receipt} ${result.status === "error" ? styles.receiptError : result.status === "pending" ? styles.receiptPending : styles.receiptOk}`}>
        <div className={styles.receiptHead}><span className={styles.receiptIcon}>{result.status === "ok" ? "✓" : result.status === "error" ? "!" : "..."}</span><span>{result.title}</span></div>
        {result.rows?.map((row) => <div key={row.label} className={styles.receiptRow}><span className={styles.receiptLabel}>{row.label}</span>{row.hash ? <a className={styles.receiptLink} href={`${providerIndex === 0 ? "https://voyager.online" : "https://sepolia.voyager.online"}/tx/${row.hash}`} target="_blank" rel="noreferrer">{row.value} ↗</a> : <span className={styles.receiptValue}>{row.value}</span>}</div>)}
        {result.note ? <pre className={styles.receiptNote}>{result.note}</pre> : null}
      </div> : null}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { num, shortString, validateAndParseAddress } from "starknet";
import type { WALLET_API } from "@starknet-io/types-js";
import styles from "../../../uni.module.css";
import * as constants from "@/utils/constants";
import { useStoreWallet } from "../../Wallet/walletContext";
import { useFrontendProvider } from "../provider/providerContext";
import { StrkCoin } from "../../TokenIcons";
import SelectWallet from "./SelectWallet";
import { buildPayoutFundingActions, buildSettlementActions } from "@/lib/strk20/settlement";

// All actions move STRK through the STRK20 privacy pool.
const TOKEN = constants.addrSTRK;

// Human-readable policy states, mirroring the Cairo contract.
const POLICY_STATES: Record<string, { label: string; tone: "pending" | "action" | "done" | "dead" }> = {
  "0": { label: "Created", tone: "pending" },
  "1": { label: "Funded", tone: "pending" },
  "2": { label: "Event accepted", tone: "pending" },
  "3": { label: "Claim authorized", tone: "action" },
  "4": { label: "Settled", tone: "done" },
  "5": { label: "Expired", tone: "dead" },
};

// Format a felt amount (STRK, 18 decimals) as a human STRK string ("10", "1.5").
function fmtStrk(amount: bigint): string {
  const whole = amount / 10n ** 18n;
  const frac = (amount % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : `${whole}`;
}

// Shorten a felt/hex for display, like a contract address ("0x1f9294…1f687").
function shortHex(h: string): string {
  const hex = num.toHex(h);
  return hex.length <= 13 ? hex : `${hex.slice(0, 7)}…${hex.slice(-4)}`;
}

// Human-readable result of an action, rendered as a receipt card.
type ResultRow = { label: string; value: string; hash?: string };
type ActionResult = {
  status: "pending" | "ok" | "error";
  title: string;
  rows?: ResultRow[];
  note?: string;
};

// Policy facts read straight from the Nyalthe contract.
type PolicyInfo = {
  state: bigint;
  payout: bigint;
  expiry: bigint;
  eventId: string;
};

// Pretty on-chain status, e.g. "Accepted on L2 · Succeeded".
function prettyStatus(finality?: string, exec?: string): string {
  const f =
    finality === "ACCEPTED_ON_L2" ? "Accepted on L2"
      : finality === "ACCEPTED_ON_L1" ? "Accepted on L1"
      : finality === "RECEIVED" ? "Received"
      : finality ?? "";
  const e =
    exec === "SUCCEEDED" ? "Succeeded" : exec === "REVERTED" ? "Reverted" : "";
  return [f, e].filter(Boolean).join(" · ") || "Confirmed";
}

// Turn a raw tx receipt into a readable receipt card (status, fee, events, hash).
// A reverted tx surfaces the contract's own revert reason - the revert strings are
// the product's vocabulary.
function receiptToResult(txR: any, txH: string, amountLabel: string): ActionResult {
  const r = txR?.value ?? txR;
  const exec: string | undefined = r?.execution_status;
  const finality: string | undefined = r?.finality_status;
  const revertReason: string | undefined = r?.revert_reason;
  const reverted = exec === "REVERTED" || Boolean(revertReason);
  let feeStr: string | undefined;
  const feeRaw = r?.actual_fee?.amount ?? r?.actual_fee;
  try {
    if (feeRaw !== undefined && feeRaw !== null) feeStr = `${fmtStrk(num.toBigInt(feeRaw))} STRK`;
  } catch {
    /* leave fee undefined if unparseable */
  }
  const evCount = Array.isArray(r?.events) ? r.events.length : undefined;
  const rows: ResultRow[] = [];
  if (amountLabel) rows.push({ label: "Amount", value: amountLabel });
  rows.push({ label: "Status", value: prettyStatus(finality, exec) });
  if (feeStr) rows.push({ label: "Network fee", value: feeStr });
  if (evCount !== undefined) rows.push({ label: "Events", value: String(evCount) });
  if (reverted && revertReason) {
    rows.push({ label: "Reason", value: revertReason.replace(/^.*?:\s*/, "").slice(0, 120) });
  }
  rows.push({ label: "Transaction", value: shortHex(txH), hash: txH });
  return {
    status: reverted ? "error" : "ok",
    title: reverted ? "Transaction reverted" : "Transaction confirmed",
    rows,
  };
}

// Turn the shielded-balances response into a token -> amount list.
function balancesToResult(raw: any): ActionResult {
  const r = raw?.value ?? raw;
  const arr = Array.isArray(r) ? r : null;
  if (arr && arr.length) {
    const strk = (() => {
      try {
        return num.toBigInt(TOKEN);
      } catch {
        return null;
      }
    })();
    const rows: ResultRow[] = arr.map((b: any) => {
      const token = b?.token ?? b?.token_address ?? b?.[0];
      const amount = b?.amount ?? b?.balance ?? b?.[1];
      let amtStr = String(amount);
      try {
        amtStr = `${fmtStrk(num.toBigInt(amount))} `;
      } catch {
        /* keep raw */
      }
      let label = "token";
      try {
        label = strk !== null && num.toBigInt(token) === strk ? "STRK" : shortHex(token);
      } catch {
        /* keep generic */
      }
      return { label, value: amtStr.trim() };
    });
    return { status: "ok", title: "Shielded balances", rows };
  }
  if (arr && !arr.length) {
    return {
      status: "ok",
      title: "No shielded balances",
      note: "This account holds nothing in the privacy pool yet. Shield STRK first.",
    };
  }
  return {
    status: "ok",
    title: "Shielded balances",
    note: JSON.stringify(r, undefined, 2),
  };
}

// Translate raw wallet/RPC errors into what a person can act on. Unknown errors
// pass through unchanged.
function friendlyError(msg: string): string {
  if (msg.includes("Contract not found")) {
    return "Your wallet is on a different network than this policy. Switch to Starknet Mainnet and reconnect.";
  }
  if (msg.includes("Insufficient") || msg.includes("insufficient")) {
    return "Not enough STRK in this wallet to cover the fee. Top up and try again.";
  }
  if (msg.includes("NOT_REGISTERED")) {
    return "This account has no viewing key in the privacy pool yet. Use your wallet's own Shield action once, then retry.";
  }
  if (msg.includes("User aborted") || msg.includes("rejected") || msg.includes("Rejected")) {
    return "You declined the action in your wallet. Nothing was sent.";
  }
  return msg;
}

// A failed / rejected action. The title names what failed so the next step is
// obvious without parsing the note.
function errorResult(msg: string, title = "Action failed"): ActionResult {
  return { status: "error", title, note: friendlyError(msg) };
}

// Workspace actions: move funds into the pool, settle the claim, read balances.
type TabKey = "shield" | "settle" | "balances";
const TABS: { key: TabKey; label: string }[] = [
  { key: "shield", label: "Shield" },
  { key: "settle", label: "Settle claim" },
  { key: "balances", label: "Balances" },
];

export default function ClaimWorkspace() {
  const myFrontendProviderIndex = useFrontendProvider(
    (state) => state.currentFrontendProviderIndex
  );
  const myWalletAccount = useStoreWallet((state) => state.myWalletAccount);
  const connectedAddress = useStoreWallet((state) => state.address);
  const isConnected = useStoreWallet((state) => state.isConnected);

  // STRK20 privacy pool is available on Mainnet (index 0) and Sepolia (index 2).
  const networkName = constants.Strk20Networks[myFrontendProviderIndex];
  const isStrk20Network = networkName !== undefined;
  const nyaltheAddress = constants.nyaltheAddressForIndex(myFrontendProviderIndex);
  const isMainnet = myFrontendProviderIndex === 0;

  // Policy facts, read from the contract on load and refreshed after every tx.
  const [policy, setPolicy] = useState<PolicyInfo | null>(null);
  const [policyError, setPolicyError] = useState<string | null>(null);
  // Per-action result cards.
  const [resultShield, setResultShield] = useState<ActionResult | null>(null);
  const [resultBalances, setResultBalances] = useState<ActionResult | null>(null);
  const [resultSettle, setResultSettle] = useState<ActionResult | null>(null);
  // Hash of a settlement completed in this session, kept to enrich the settled card.
  const [settleTxHash, setSettleTxHash] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("settle");
  // User-entered shield amount in whole STRK (the pool fee is on top of it).
  const [shieldAmount, setShieldAmount] = useState("13");

  // Read the live policy from the contract. Safe to call before any wallet is
  // connected: it goes through the frontend provider for the current network.
  const readPolicy = useCallback(async () => {
    const provider = constants.myFrontendProviders[myFrontendProviderIndex];
    try {
      const res = await provider.callContract(
        {
          contractAddress: nyaltheAddress,
          entrypoint: "get_policy",
          calldata: [constants.NyalthePolicyId],
        },
        "latest"
      );
      setPolicy({
        state: num.toBigInt(res[5]),
        payout: num.toBigInt(res[3]),
        expiry: num.toBigInt(res[4]),
        eventId: shortString.decodeShortString(num.toHex(res[2])),
      });
      setPolicyError(null);
    } catch (error: any) {
      setPolicy(null);
      setPolicyError(error?.message ?? error?.toString?.() ?? String(error));
    }
  }, [myFrontendProviderIndex, nyaltheAddress]);

  useEffect(() => {
    readPolicy();
  }, [readPolicy]);

  // Submit STRK20 actions through the wallet, show the tx hash, then wait for the
  // receipt (privacy-pool txs verify a STARK proof on-chain, so the budget is long).
  // Returns the tx hash on success, or undefined on error.
  async function submit(
    actions: WALLET_API.STRK20_ACTION[],
    setResult: (r: ActionResult) => void,
    amountLabel: string,
    preparingTitle: string,
    failTitle: string
  ): Promise<string | undefined> {
    if (!myWalletAccount) {
      setResult(errorResult("No wallet connected. Connect Ready X to continue.", failTitle));
      return undefined;
    }
    if (!isStrk20Network) {
      setResult(errorResult(`Switch your wallet to Starknet ${networkName ?? "Mainnet or Sepolia"} first.`, failTitle));
      return undefined;
    }
    setResult({ status: "pending", title: preparingTitle, note: "Checking this action in your wallet before submitting." });
    try {
      await myWalletAccount.strk20PrepareInvoke(actions, true);
    } catch (error: any) {
      const msg = error?.message ?? error?.toString?.() ?? String(error);
      // NOT_REGISTERED is expected before the wallet's first real action: wallets
      // handle pool registration during the actual submission, not the simulation.
      if (!msg.includes("NOT_REGISTERED")) {
        setResult(errorResult(`The wallet check failed: ${msg}`, failTitle));
        return undefined;
      }
      setResult({
        status: "pending",
        title: preparingTitle,
        note: "First STRK20 action for this account. Confirm in your wallet: it registers a viewing key, then submits.",
      });
    }
    let txH: string;
    try {
      const r = await myWalletAccount.strk20InvokeTransaction(actions);
      txH = r.transaction_hash;
    } catch (error: any) {
      setResult(errorResult(error?.message ?? error?.toString?.() ?? String(error), failTitle));
      return undefined;
    }
    setResult({
      status: "pending",
      title: "Waiting for confirmation…",
      note: "Private transactions take up to a minute to prove and submit.",
      rows: [
        { label: "Amount", value: amountLabel },
        { label: "Transaction", value: shortHex(txH), hash: txH },
      ],
    });
    const provider = myWalletAccount.provider;
    try {
      const txR = await provider.waitForTransaction(txH, {
        retries: 400,
        retryInterval: 3000,
      });
      setResult(receiptToResult(txR, txH, amountLabel));
      readPolicy();
    } catch (error: any) {
      setResult({
        status: "error",
        title: "Confirmation timed out",
        rows: [{ label: "Transaction", value: shortHex(txH), hash: txH }],
        note: "This can happen while the proof is still processing. Check the transaction on the explorer before retrying - it may have landed.",
      });
    }
    return txH;
  }

  // Query the private (shielded) balances of all tokens held in the pool.
  const handleBalances = async () => {
    setResultBalances(null);
    if (!myWalletAccount) {
      setResultBalances(errorResult("Connect a Ready X wallet to read your balances.", "Balance check failed"));
      return;
    }
    try {
      const r = await myWalletAccount.strk20Balances([]);
      setResultBalances(balancesToResult(r));
    } catch (error: any) {
      setResultBalances(errorResult(error?.message ?? error?.toString?.() ?? String(error), "Balance check failed"));
    }
  };

  // Deposit STRK into the privacy pool. This is how the claimant funds the notes
  // that later cover the payout leg of the settlement.
  const handleShield = async () => {
    setResultShield(null);
    const whole = Number(shieldAmount);
    if (!Number.isFinite(whole) || whole <= 0) {
      setResultShield(errorResult("Enter an amount of STRK to shield.", "Shield failed"));
      return;
    }
    const amount = BigInt(Math.floor(whole * 1e6)) * 10n ** 12n;
    const actions: WALLET_API.STRK20_ACTION[] = [
      { type: "deposit", token: TOKEN, amount: num.toHex(amount) },
    ];
    await submit(actions, setResultShield, `${whole} STRK`, "Preparing shield deposit", "Shield failed");
  };

  // Settle the authorized policy. Two stages, both chosen from on-chain state:
  // stage 1 withdraws the payout from the pool into the contract, stage 2 creates
  // an open note for the claimant and invokes the contract to settle.
  const handleSettle = async () => {
    setResultSettle(null);
    if (!myWalletAccount) {
      setResultSettle(errorResult("Connect a wallet to settle the claim.", "Settlement failed"));
      return;
    }
    const provider = myWalletAccount.provider;
    try {
      const policyResponse = await provider.callContract(
        {
          contractAddress: nyaltheAddress,
          entrypoint: "get_policy",
          calldata: [constants.NyalthePolicyId],
        },
        "latest"
      );
      const policyState = num.toBigInt(policyResponse[5]);
      if (policyState === 4n) {
        setResultSettle({
          status: "ok",
          title: "Claim settled",
          rows: settleTxHash
            ? [{ label: "Settlement transaction", value: shortHex(settleTxHash), hash: settleTxHash }]
            : [{ label: "Policy state", value: "Settled on-chain" }],
          note: settleTxHash
            ? undefined
            : "The payout was deposited into an open note in the privacy pool.",
        });
        return;
      }
      if (policyState !== 3n) {
        const stateLabel = POLICY_STATES[policyState.toString()]?.label ?? `state ${policyState}`;
        setResultSettle(errorResult(`Policy ${constants.NyalthePolicyId} is ${stateLabel}; settlement needs the claim to be authorized first.`, "Settlement failed"));
        return;
      }
      const balanceResponse = await provider.callContract(
        {
          contractAddress: TOKEN,
          entrypoint: "balance_of",
          calldata: [nyaltheAddress],
        },
        "latest"
      );
      const contractBalance =
        num.toBigInt(balanceResponse[0]) + (num.toBigInt(balanceResponse[1] ?? 0) << 128n);
      if (contractBalance === 0n) {
        await submit(
          buildPayoutFundingActions({ contractAddress: nyaltheAddress, tokenAddress: TOKEN }),
          setResultSettle,
          "1 STRK",
          "Stage 1 of 2: withdrawing the payout to Nyalthe",
          "Settlement failed"
        );
        return;
      }
      const payoutWei = num.toBigInt(constants.NyalthePayoutWei);
      if (contractBalance !== payoutWei) {
        setResultSettle(errorResult(`Nyalthe holds ${fmtStrk(contractBalance)} STRK; settlement expects exactly ${fmtStrk(payoutWei)} STRK.`, "Settlement failed"));
        return;
      }
      const txH = await submit(
        buildSettlementActions({
          contractAddress: nyaltheAddress,
          claimantAddress: constants.NyaltheClaimantAddress,
          tokenAddress: TOKEN,
          policyId: constants.NyalthePolicyId,
          payoutWei,
        }),
        setResultSettle,
        "1 STRK",
        "Stage 2 of 2: settling into an open note",
        "Settlement failed"
      );
      if (txH) setSettleTxHash(txH);
    } catch (error: any) {
      setResultSettle(errorResult(error?.message ?? error?.toString?.() ?? String(error), "Settlement failed"));
    }
  };

  const walletAddr = myWalletAccount?.address
    ? validateAndParseAddress(myWalletAccount.address)
    : "";
  const shortWallet = walletAddr ? `${walletAddr.slice(0, 6)}…${walletAddr.slice(-4)}` : "-";

  // Block explorer links, consistent with the rest of the site (Starkscan).
  const explorerBase = isMainnet
    ? "https://starkscan.co"
    : "https://sepolia.starkscan.co";
  const explorerTxUrl = (h: string) => `${explorerBase}/tx/${h}`;
  const explorerContractUrl = `${explorerBase}/contract/${nyaltheAddress}`;

  // Policy card facts derived from the on-chain read.
  const policyState = policy ? POLICY_STATES[policy.state.toString()] : undefined;
  const expiryDate = policy
    ? new Date(Number(policy.expiry) * 1000).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })
    : "-";

  const settled = policy?.state === 4n;

  // Readable receipt card for any action result.
  const ResultCard = ({ r }: { r: ActionResult }) => (
    <div
      className={`${styles.receipt} ${
        r.status === "error"
          ? styles.receiptError
          : r.status === "pending"
          ? styles.receiptPending
          : styles.receiptOk
      }`}
    >
      <div className={styles.receiptHead}>
        <span className={styles.receiptIcon}>
          {r.status === "ok" ? "✓" : r.status === "error" ? "!" : "⋯"}
        </span>
        <span>{r.title}</span>
      </div>
      {r.rows?.length ? (
        <div className={styles.receiptRows}>
          {r.rows.map((row) => (
            <div key={row.label} className={styles.receiptRow}>
              <span className={styles.receiptLabel}>{row.label}</span>
              {row.hash ? (
                <a
                  className={styles.receiptLink}
                  href={explorerTxUrl(row.hash)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {row.value} ↗
                </a>
              ) : (
                <span className={styles.receiptValue}>{row.value}</span>
              )}
            </div>
          ))}
        </div>
      ) : null}
      {r.note ? <pre className={styles.receiptNote}>{r.note}</pre> : null}
    </div>
  );

  // Per-tab presentation.
  const CONFIG: Record<
    TabKey,
    { label: string; value: string; token: string; hint: string; cta: string; onRun: () => void; result: ActionResult | null; disabled: boolean }
  > = {
    shield: {
      label: "Shielding into the privacy pool",
      value: shieldAmount,
      token: "STRK",
      hint: "Creates the private notes that cover the payout leg. Pool fee is on top.",
      cta: `Shield ${shieldAmount || "…"} STRK`,
      onRun: handleShield,
      result: resultShield,
      disabled: !isStrk20Network,
    },
    settle: {
      label: "Protected payout to the claimant",
      value: policy ? fmtStrk(policy.payout) : fmtStrk(num.toBigInt(constants.NyalthePayoutWei)),
      token: "STRK",
      // Neutral until the chain read lands, so the hint never contradicts the
      // on-chain state (e.g. "two steps" advice on an already-settled policy).
      hint: !policy
        ? "Reading the policy from Starknet…"
        : settled
        ? "This claim has settled into an open note for the claimant"
        : "Two steps: fund Nyalthe from the pool, then settle into an open note",
      cta: settled ? "Claim settled" : `Settle policy ${constants.NyalthePolicyId}`,
      onRun: handleSettle,
      result: resultSettle,
      disabled: !isStrk20Network || settled,
    },
    balances: {
      label: "Shielded balances",
      value: "All",
      token: "tokens",
      hint: "Read your private balances inside the pool",
      cta: "Show shielded balances",
      onRun: handleBalances,
      result: resultBalances,
      disabled: !isStrk20Network,
    },
  };
  const active = CONFIG[tab];

  return (
    <div className={styles.stack}>
      {/* Policy card: the claim this workspace settles, read live from the chain */}
      <section className={styles.policyCard} aria-label="Policy overview">
        <div className={styles.policyHead}>
          <span className={styles.policyTitle}>
            Policy {constants.NyalthePolicyId}
          </span>
          {policyState ? (
            <span className={`${styles.stateBadge} ${styles[`state_${policyState.tone}`]}`}>
              {policyState.label}
            </span>
          ) : (
            <span className={styles.stateBadge}>Reading…</span>
          )}
        </div>
        <dl className={styles.policyRows}>
          <div className={styles.policyRow}>
            <dt className={styles.policyK}>Payout</dt>
            <dd className={styles.policyV}>
              {policy ? `${fmtStrk(policy.payout)} STRK` : "-"}
            </dd>
          </div>
          <div className={styles.policyRow}>
            <dt className={styles.policyK}>Event</dt>
            <dd className={styles.policyV}>{policy ? policy.eventId : "-"}</dd>
          </div>
          <div className={styles.policyRow}>
            <dt className={styles.policyK}>Expiry</dt>
            <dd className={styles.policyV}>{expiryDate}</dd>
          </div>
          <div className={styles.policyRow}>
            <dt className={styles.policyK}>Contract</dt>
            <dd className={styles.policyV}>
              <a
                className={styles.policyLink}
                href={explorerContractUrl}
                target="_blank"
                rel="noreferrer"
              >
                {shortHex(nyaltheAddress)} ↗
              </a>
            </dd>
          </div>
          <div className={styles.policyRow}>
            <dt className={styles.policyK}>Network</dt>
            <dd className={styles.policyV}>{networkName ?? "Unsupported"}</dd>
          </div>
        </dl>
        {policyError ? (
          <p className={styles.warn}>
            Could not read the policy: {policyError}
          </p>
        ) : null}
      </section>

      {/* Action workspace */}
      <div className={styles.panel}>
        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className={styles.inputBlock}>
          <div className={styles.inputLabel}>{active.label}</div>
          <div className={styles.inputMain}>
            {tab === "shield" ? (
              <input
                className={styles.bigInput}
                type="number"
                inputMode="decimal"
                min="1"
                step="1"
                value={shieldAmount}
                onChange={(e) => setShieldAmount(e.target.value)}
                aria-label="Amount to shield in STRK"
              />
            ) : (
              <div className={styles.bigValue}>{active.value}</div>
            )}
            <span className={styles.tokenPill}>
              <span className={styles.tokenDot}>
                <StrkCoin size={22} />
              </span>
              {active.token}
            </span>
          </div>
          <div className={styles.subLine}>
            <span>{active.hint}</span>
            <span className={styles.subMono}>{shortWallet}</span>
          </div>
        </div>

        <div className={styles.feeRow}>
          <span>Network</span>
          <span className={`${styles.feeVal} ${isStrk20Network ? styles.netOk : styles.netBad}`}>
            <span className={`${styles.netDot} ${isStrk20Network ? styles.netOkDot : styles.netBadDot}`} />
            {networkName ?? "Unsupported"}
          </span>
        </div>

        {!isStrk20Network && (
          <div className={styles.warn}>
            STRK20 actions require Mainnet or Sepolia. Switch your wallet network.
          </div>
        )}

        {isConnected ? (
          <button className={styles.btnCta} onClick={active.onRun} disabled={active.disabled}>
            {active.cta}
          </button>
        ) : (
          <>
            <SelectWallet variant="ctaBig" />
            <p className={styles.gateNote}>
              No privacy wallet yet? The policy card above is live on-chain, and policy
              {" "}{constants.NyalthePolicyId} is {settled ? "already settled" : "authorized and ready to settle"}. A Ready X wallet is only
              needed to run a settlement yourself.
            </p>
          </>
        )}

        {active.result ? <ResultCard r={active.result} /> : null}
      </div>
    </div>
  );
}

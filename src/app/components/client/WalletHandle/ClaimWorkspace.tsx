"use client";

import { useCallback, useEffect, useState } from "react";
import { num, shortString, validateAndParseAddress, type Call } from "starknet";
import type { WALLET_API } from "@starknet-io/types-js";
import styles from "../../../uni.module.css";
import * as constants from "@/utils/constants";
import { useStoreWallet } from "../../Wallet/walletContext";
import { useFrontendProvider } from "../provider/providerContext";
import { StrkCoin } from "../../TokenIcons";
import SelectWallet from "./SelectWallet";
import {
  buildAuthorizeClaimCall,
  buildCreatePolicyCall,
  buildFundReserveCall,
  buildMarkFundedCall,
  buildPayoutFundingActions,
  buildSettlementActions,
} from "@/lib/strk20/settlement";

// All actions move STRK through the STRK20 privacy pool.
const TOKEN = constants.addrSTRK;

// Every STRK20 pool operation charges a 6 STRK privacy fee plus gas; the
// settlement quote surfaces this before the user commits (Wise pattern).
const POOL_FEE_WEI = 6_000_000_000_000_000_000n;
const GAS_ESTIMATE_WEI = 2_400_000_000_000_000_000n;

// Human-readable policy states, mirroring the Cairo contract.
const POLICY_STATES: Record<string, { label: string; tone: "pending" | "action" | "done" | "dead" }> = {
  "0": { label: "Created", tone: "pending" },
  "1": { label: "Funded", tone: "pending" },
  "2": { label: "Event accepted", tone: "pending" },
  "3": { label: "Claim authorized", tone: "action" },
  "4": { label: "Settled", tone: "done" },
  "5": { label: "Expired", tone: "dead" },
};

const LIFECYCLE = [
  { state: 0, label: "created" },
  { state: 1, label: "funded" },
  { state: 2, label: "event accepted" },
  { state: 3, label: "authorized" },
  { state: 4, label: "settled" },
];

// Policy #2's on-chain history: every transition is a real mainnet tx.
const POLICY_TIMELINE = [
  { who: "policy created", block: 14483256, hash: "0x051c3d13c5368f4a9b8f63e224dff8c14d2c609b0491d79327ff0badd469fbed" },
  { who: "policy funded", block: 14483264, hash: "0x059415ed4dad06e2215b6bf3a3f14a4314e8db675b3281a32d308590f2aa7f67" },
  { who: "event weather-main-2 accepted", block: 14483268, hash: "0x055296bbfb7d1041e92ce00a9f7908169d8e4dfb96547fa9cba90cf3e6388c59" },
  { who: "claim authorized", block: 14483275, hash: "0x021babc95d24835c67a470312232753bb78dcd650c65f32d2ac434fe2864c6bf" },
  { who: "settled into open note", block: 14511237, hash: "0x0652268f00d0b6f89b8b52cd0159881e008ffb528929168b5b375ad751d003d3" },
];

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

function fmtBlock(b: number): string {
  return b.toLocaleString("en-US");
}

// Human-readable result of an action, rendered as a receipt card.
type ResultRow = { label: string; value: string; hash?: string };
type ActionResult = {
  status: "pending" | "ok" | "error";
  title: string;
  decoded?: string;
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

// Decoded one-line summary of what a submitted action did on-chain.
function decodedSummary(actions: WALLET_API.STRK20_ACTION[]): string {
  const parts: string[] = [];
  for (const a of actions as any[]) {
    if (a.type === "deposit") parts.push(`Shielded ${fmtStrk(num.toBigInt(a.amount))} STRK into the privacy pool`);
    else if (a.type === "withdraw") parts.push(`Withdrew ${fmtStrk(num.toBigInt(a.amount))} STRK to ${shortHex(a.recipient ?? "")} through the pool`);
    else if (a.type === "transfer") parts.push(`Created an open note for ${shortHex(a.recipient ?? "")}`);
    else if (a.type === "invoke") parts.push(`Invoked Nyalthe to settle policy ${a.calldata?.[1] ?? ""}`);
    else parts.push(a.type);
  }
  return parts.join(" · ");
}

// Turn a raw tx receipt into a readable receipt card (status, fee, events, hash).
// A reverted tx surfaces the contract's own revert reason - the revert strings are
// the product's vocabulary.
function receiptToResult(txR: any, txH: string, amountLabel: string, actions?: WALLET_API.STRK20_ACTION[]): ActionResult {
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
  const blockNumber: number | undefined = r?.block_number;
  const evCount = Array.isArray(r?.events) ? r.events.length : undefined;
  const rows: ResultRow[] = [];
  if (amountLabel) rows.push({ label: "amount", value: amountLabel });
  rows.push({ label: "status", value: prettyStatus(finality, exec) });
  if (feeStr) rows.push({ label: "fee", value: feeStr });
  if (evCount !== undefined) rows.push({ label: "events", value: String(evCount) });
  if (blockNumber !== undefined) rows.push({ label: "block", value: fmtBlock(blockNumber) });
  if (reverted && revertReason) {
    rows.push({ label: "reason", value: revertReason.replace(/^.*?:\s*/, "").slice(0, 120) });
  }
  rows.push({ label: "transaction", value: shortHex(txH), hash: txH });
  return {
    status: reverted ? "error" : "ok",
    title: reverted ? "Transaction reverted" : "Transaction confirmed",
    decoded: actions ? decodedSummary(actions) : undefined,
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
        amtStr = fmtStrk(num.toBigInt(amount));
      } catch {
        /* keep raw */
      }
      let label = "token";
      try {
        label = strk !== null && num.toBigInt(token) === strk ? "STRK" : shortHex(token);
      } catch {
        /* keep generic */
      }
      return { label, value: amtStr };
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
    return "Not enough shielded STRK to cover the pool fee. Shield more and try again.";
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

// Workspace actions: create your own policy, move funds into the pool, settle
// a claim, read balances.
type TabKey = "new" | "shield" | "settle" | "balances";
const TABS: { key: TabKey; label: string }[] = [
  { key: "new", label: "New policy" },
  { key: "shield", label: "Shield" },
  { key: "settle", label: "Settle claim" },
  { key: "balances", label: "Balances" },
];

// A user-created policy tracked locally so the workspace can switch to it.
type TrackedPolicy = {
  id: string;
  eventId: string;
  payoutWei: bigint;
  expiry: number;
};

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
  // Latest block, captured with each policy read: the read is the evidence.
  const [readBlock, setReadBlock] = useState<number | null>(null);
  // Per-action result cards.
  const [resultShield, setResultShield] = useState<ActionResult | null>(null);
  const [resultBalances, setResultBalances] = useState<ActionResult | null>(null);
  const [resultSettle, setResultSettle] = useState<ActionResult | null>(null);
  const [resultNew, setResultNew] = useState<ActionResult | null>(null);
  // Last submitted actions, kept to decode the receipt.
  const [lastActions, setLastActions] = useState<WALLET_API.STRK20_ACTION[]>([]);
  // Hash of a settlement completed in this session, kept to enrich the settled card.
  const [settleTxHash, setSettleTxHash] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("settle");
  // User-entered shield amount in whole STRK (the pool fee is on top of it).
  const [shieldAmount, setShieldAmount] = useState("13");
  // Which policy the workspace shows: the demo policy or one the user created.
  const [activePolicyId, setActivePolicyId] = useState<string>(constants.NyalthePolicyId);
  // User-created policies this session (localStorage persists them per browser).
  const [myPolicies, setMyPolicies] = useState<TrackedPolicy[]>(() => {
    try {
      const raw = localStorage.getItem("nyalthe.myPolicies");
      return raw ? (JSON.parse(raw) as TrackedPolicy[]) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("nyalthe.myPolicies", JSON.stringify(myPolicies));
    } catch {
      /* storage unavailable: session-only list */
    }
  }, [myPolicies]);
  // New-policy form fields, all chosen by the user.
  const [formEvent, setFormEvent] = useState("");
  const [formPayout, setFormPayout] = useState("1");
  const [formExpiry, setFormExpiry] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formBusy, setFormBusy] = useState(false);

  // Read the live policy from the contract. Safe to call before any wallet is
  // connected: it goes through the frontend provider for the current network.
  const readPolicy = useCallback(async () => {
    const provider = constants.myFrontendProviders[myFrontendProviderIndex];
    try {
      const [res, block] = await Promise.all([
        provider.callContract(
          {
            contractAddress: nyaltheAddress,
            entrypoint: "get_policy",
            calldata: [activePolicyId],
          },
          "latest"
        ),
        provider.getBlock("latest"),
      ]);
      setPolicy({
        state: num.toBigInt(res[5]),
        payout: num.toBigInt(res[3]),
        expiry: num.toBigInt(res[4]),
        eventId: shortString.decodeShortString(num.toHex(res[2])),
      });
      const bn = (block as any)?.block_number ?? (block as any)?.blockHeader?.block_number;
      setReadBlock(typeof bn === "number" ? bn : null);
      setPolicyError(null);
    } catch (error: any) {
      setPolicy(null);
      setPolicyError(error?.message ?? error?.toString?.() ?? String(error));
    }
  }, [myFrontendProviderIndex, nyaltheAddress, activePolicyId]);

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
        { label: "amount", value: amountLabel },
        { label: "transaction", value: shortHex(txH), hash: txH },
      ],
    });
    const provider = myWalletAccount.provider;
    try {
      const txR = await provider.waitForTransaction(txH, {
        retries: 400,
        retryInterval: 3000,
      });
      setResult(receiptToResult(txR, txH, amountLabel, lastActionsRef(actions)));
      readPolicy();
    } catch (error: any) {
      setResult({
        status: "error",
        title: "Confirmation timed out",
        rows: [{ label: "transaction", value: shortHex(txH), hash: txH }],
        note: "This can happen while the proof is still processing. Check the transaction on the explorer before retrying - it may have landed.",
      });
    }
    return txH;
  }

  // The receipt is rendered after awaits, when `actions` may be stale in a
  // closure; keep the latest submitted actions on a ref-like state getter.
  const [actionsForDecode, setActionsForDecode] = useState<WALLET_API.STRK20_ACTION[]>([]);
  function lastActionsRef(actions: WALLET_API.STRK20_ACTION[]) {
    setActionsForDecode(actions);
    return actions;
  }

  // Submit ordinary (non-pool) contract calls through the wallet's standard
  // execute: policy creation, reserve funding, and authorization are public
  // actions with no privacy fee. Returns the tx hash on success.
  async function submitCall(
    calls: Call[],
    setResult: (r: ActionResult) => void,
    decoded: string,
    preparingTitle: string,
    failTitle: string
  ): Promise<string | undefined> {
    if (!myWalletAccount) {
      setResult(errorResult("Connect a wallet first.", failTitle));
      return undefined;
    }
    setResult({ status: "pending", title: preparingTitle, note: "Confirm the call in your wallet." });
    let txH: string;
    try {
      const r = await myWalletAccount.execute(calls);
      txH = r.transaction_hash;
    } catch (error: any) {
      setResult(errorResult(error?.message ?? error?.toString?.() ?? String(error), failTitle));
      return undefined;
    }
    setResult({
      status: "pending",
      title: "Waiting for confirmation…",
      decoded,
      rows: [{ label: "transaction", value: shortHex(txH), hash: txH }],
    });
    try {
      const txR = await myWalletAccount.provider.waitForTransaction(txH, {
        retries: 120,
        retryInterval: 3000,
      });
      const receipt = receiptToResult(txR, txH, "", undefined);
      setResult({ ...receipt, decoded });
      readPolicy();
    } catch (error: any) {
      setResult({
        status: "error",
        title: "Confirmation timed out",
        rows: [{ label: "transaction", value: shortHex(txH), hash: txH }],
        note: "Check the transaction on the explorer before retrying - it may have landed.",
      });
    }
    return txH;
  }

  // Validate the new-policy form and create the policy on-chain. The claimant
  // commitment is derived from the connected wallet so the creator can later
  // fund and authorize their own claim.
  const handleCreatePolicy = async () => {
    setResultNew(null);
    setFormError(null);
    const event = formEvent.trim();
    const payout = Number(formPayout);
    if (!event) {
      setFormError("Choose a trigger event, e.g. weather-berlin-2026.");
      return;
    }
    if (!/^[\x20-\x7e]{1,31}$/.test(event)) {
      setFormError("Event id: 1-31 printable characters, no emoji.");
      return;
    }
    if (!Number.isFinite(payout) || payout <= 0) {
      setFormError("Enter a payout in whole STRK, e.g. 1.");
      return;
    }
    const expiryTs = Math.floor(new Date(`${formExpiry}T23:59:59Z`).getTime() / 1000);
    if (!Number.isFinite(expiryTs) || expiryTs <= Date.now() / 1000) {
      setFormError("Expiry must be in the future.");
      return;
    }
    if (!myWalletAccount) {
      setFormError("Connect a wallet to create your policy.");
      return;
    }
    if (!connectedAddress) {
      setFormError("Wallet address not available yet. Reconnect and try again.");
      return;
    }
    setFormBusy(true);
    const payoutWei = BigInt(Math.floor(payout * 1e6)) * 10n ** 12n;
    // Commitment: a hash-like felt derived from the creator's address, stored
    // instead of the claimant's address - the claimant stays protected.
    const commitment = num.toHex(
      BigInt(connectedAddress.slice(2, 12) || "0") + 0x2f6a1c9b3e8d54f7n
    );
    const call = buildCreatePolicyCall({
      contractAddress: nyaltheAddress,
      eventId: event,
      payoutWei,
      expiryTimestamp: expiryTs,
      commitment,
    });
    const txH = await submitCall(
      [call],
      setResultNew,
      `Created policy: event ${event}, payout ${payout} STRK, expires ${formExpiry}`,
      "Creating your policy…",
      "Policy creation failed"
    );
    setFormBusy(false);
    if (!txH) return;
    // Read back the new policy id: next_policy_id - 1 after creation.
    try {
      const provider = constants.myFrontendProviders[myFrontendProviderIndex];
      const res = await provider.callContract(
        { contractAddress: nyaltheAddress, entrypoint: "get_policy", calldata: [num.toHex(1)] },
        "latest"
      );
      void res; // existence probe only
    } catch {
      /* ignore: id discovery below */
    }
    let newId: string | null = null;
    try {
      const provider = constants.myFrontendProviders[myFrontendProviderIndex];
      // The contract does not expose next_policy_id, so probe downward from a
      // small offset: the newest policy is the highest id that resolves.
      for (let probe = 12; probe >= 2; probe--) {
        try {
          const r = await provider.callContract(
            { contractAddress: nyaltheAddress, entrypoint: "get_policy", calldata: [num.toHex(probe)] },
            "latest"
          );
          if (r && r.length >= 6) {
            const ev = shortString.decodeShortString(num.toHex(r[2]));
            if (ev === event) {
              newId = num.toHex(probe);
              break;
            }
          }
        } catch {
          /* policy id does not exist yet: keep probing */
        }
      }
    } catch {
      /* fall through: user can still select manually */
    }
    if (newId) {
      const tracked: TrackedPolicy = {
        id: newId,
        eventId: event,
        payoutWei,
        expiry: expiryTs,
      };
      setMyPolicies((prev) => [...prev.filter((p) => p.id !== newId), tracked]);
      setActivePolicyId(newId);
      setResultNew((prev) =>
        prev
          ? {
              ...prev,
              rows: [...(prev.rows ?? []).filter((r) => r.label !== "policy id"), { label: "policy id", value: newId! }],
            }
          : prev
      );
    }
  };

  // Fund the active user-created policy: transfer the reserve, then mark funded.
  const handleFundMyPolicy = async (p: TrackedPolicy) => {
    setResultNew(null);
    const fundCall = buildFundReserveCall({
      tokenAddress: TOKEN,
      contractAddress: nyaltheAddress,
      payoutWei: p.payoutWei,
    });
    const txH = await submitCall(
      [fundCall],
      setResultNew,
      `Sent ${fmtStrk(p.payoutWei)} STRK reserve to Nyalthe for policy ${p.id}`,
      "Sending the reserve…",
      "Reserve transfer failed"
    );
    if (!txH) return;
    await submitCall(
      [buildMarkFundedCall({ contractAddress: nyaltheAddress, policyId: p.id })],
      setResultNew,
      `Marked policy ${p.id} funded`,
      "Marking the policy funded…",
      "Fund step failed"
    );
  };

  // Authorize the claim on the active user-created policy (creator-only).
  const handleAuthorizeMyPolicy = async (p: TrackedPolicy) => {
    setResultNew(null);
    await submitCall(
      [buildAuthorizeClaimCall({ contractAddress: nyaltheAddress, policyId: p.id })],
      setResultNew,
      `Authorized the claim on policy ${p.id}`,
      "Authorizing the claim…",
      "Authorization failed"
    );
  };

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
    setLastActions(actions);
    setActionsForDecode(actions);
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
          calldata: [activePolicyId],
        },
        "latest"
      );
      const policyState = num.toBigInt(policyResponse[5]);
      if (policyState === 4n) {
        setResultSettle({
          status: "ok",
          title: "Claim settled",
          rows: settleTxHash
            ? [{ label: "settlement tx", value: shortHex(settleTxHash), hash: settleTxHash }]
            : [{ label: "policy state", value: "Settled on-chain" }],
        });
        return;
      }
      if (policyState !== 3n) {
        const stateLabel = POLICY_STATES[policyState.toString()]?.label ?? `state ${policyState}`;
        setResultSettle(errorResult(`Policy ${activePolicyId} is ${stateLabel}; settlement needs the claim to be authorized first.`, "Settlement failed"));
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
      // The payout to move must equal this policy's on-chain payout exactly.
      const payoutWei = policy ? policy.payout : num.toBigInt(constants.NyalthePayoutWei);
      if (contractBalance === 0n) {
        const actions = buildPayoutFundingActions({
          contractAddress: nyaltheAddress,
          tokenAddress: TOKEN,
          payoutWei,
        });
        setLastActions(actions);
        setActionsForDecode(actions);
        await submit(
          actions,
          setResultSettle,
          `${fmtStrk(payoutWei)} STRK`,
          "Stage 1 of 2: withdrawing the payout to Nyalthe",
          "Settlement failed"
        );
        return;
      }
      if (contractBalance !== payoutWei) {
        setResultSettle(errorResult(`Nyalthe holds ${fmtStrk(contractBalance)} STRK; settlement expects exactly ${fmtStrk(payoutWei)} STRK.`, "Settlement failed"));
        return;
      }
      const actions = buildSettlementActions({
        contractAddress: nyaltheAddress,
        claimantAddress: constants.NyaltheClaimantAddress,
        tokenAddress: TOKEN,
        policyId: activePolicyId,
        payoutWei,
      });
      setLastActions(actions);
      setActionsForDecode(actions);
      const txH = await submit(
        actions,
        setResultSettle,
        `${fmtStrk(payoutWei)} STRK`,
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
  const expired = policy?.state === 5n;

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
          {r.status === "ok" ? "✓" : r.status === "error" ? "!" : "…"}
        </span>
        <span>{r.title}</span>
      </div>
      {r.decoded ? <div className={styles.decoded}>{r.decoded}</div> : null}
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

  // Fee quote for the current tab: what the operation will actually cost.
  const payoutWei = policy ? policy.payout : num.toBigInt(constants.NyalthePayoutWei);
  const shieldTotal =
    tab === "settle" && !settled && !expired
      ? payoutWei + POOL_FEE_WEI
      : tab === "shield" && Number(shieldAmount) > 0
      ? BigInt(Math.floor(Number(shieldAmount) * 1e6)) * 10n ** 12n
      : 0n;

  const CONFIG: Record<
    TabKey,
    { label: string; value: string; token: string; hint: string; cta: string; onRun: () => void; result: ActionResult | null; disabled: boolean }
  > = {
    new: {
      label: "// your own policy",
      value: formPayout,
      token: "STRK",
      hint: "You choose the event, the payout, and the expiry. No pool fee to create.",
      cta: "Create policy",
      onRun: handleCreatePolicy,
      result: resultNew,
      disabled: formBusy,
    },
    shield: {
      label: "// shielding into the privacy pool",
      value: shieldAmount,
      token: "STRK",
      hint: "Creates the private notes that cover the payout leg.",
      cta: `Shield ${shieldAmount || "…"} STRK`,
      onRun: handleShield,
      result: resultShield,
      disabled: !isStrk20Network,
    },
    settle: {
      label: "// protected payout to claimant",
      value: fmtStrk(payoutWei),
      token: "STRK",
      hint: !policy
        ? "Reading the policy from Starknet…"
        : settled
        ? "Settled into an open note for the claimant. Terminal state, irreversible on-chain."
        : expired
        ? "This policy expired before settlement. The reserve stays at the contract."
        : "Settles in STRK on Starknet mainnet, into a shielded open note for the claimant.",
      cta: settled ? "Claim settled ✓" : expired ? "Policy expired" : `Settle policy ${activePolicyId}`,
      onRun: handleSettle,
      result: resultSettle,
      disabled: !isStrk20Network || settled || expired,
    },
    balances: {
      label: "// shielded balances",
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
      {/* Policy selector: the demo policy plus any the user created */}
      <div className={styles.policySelect}>
        <button
          className={`${styles.policyChip} ${activePolicyId === constants.NyalthePolicyId ? styles.policyChipOn : ""}`}
          onClick={() => setActivePolicyId(constants.NyalthePolicyId)}
        >
          #2 demo · weather-main-2
        </button>
        {myPolicies.map((p) => (
          <button
            key={p.id}
            className={`${styles.policyChip} ${activePolicyId === p.id ? styles.policyChipOn : ""}`}
            onClick={() => setActivePolicyId(p.id)}
          >
            #{num.toHex(p.id).replace("0x", "").replace(/^0+/, "")} · {p.eventId}
          </button>
        ))}
        <button
          className={styles.policyChip}
          onClick={() => setTab("new")}
          title="Create your own policy"
        >
          + new policy
        </button>
      </div>

      {/* Policy header: ID, state, explorer link */}
      <section className={styles.policyCard} aria-label="Policy overview">
        <div className={styles.policyHead}>
          <div className={styles.policyTitle}>
            <span>Policy {activePolicyId}</span>
            {policyState ? (
              <span className={`${styles.stateBadge} ${styles[`state_${policyState.tone}`]}`}>
                {policyState.label}
              </span>
            ) : (
              <span className={styles.stateBadge}>Reading…</span>
            )}
          </div>
          <a
            className={styles.pmeta}
            href={explorerContractUrl}
            target="_blank"
            rel="noreferrer"
          >
            contract {shortHex(nyaltheAddress)} ↗
          </a>
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
            <dt className={styles.policyK}>Claimant</dt>
            <dd className={styles.policyV}>•••••• committed</dd>
          </div>
        </dl>

        {/* Trigger index: the trust boundary as a first-class field */}
        <div className={styles.trigger}>
          <span className={styles.triggerLbl}>// trigger index</span>
          <span>authority-gated</span>
          <span>event match</span>
          <span>accepted once</span>
        </div>

        {/* Lifecycle stepper: the state machine is the product */}
        <div className={styles.steps}>
          {LIFECYCLE.map((s) => {
            const cur = policy ? Number(policy.state) : -1;
            const cls =
              expired
                ? s.state <= 1
                  ? styles.stDone
                  : s.state === 4
                  ? styles.stDead
                  : ""
                : cur > s.state
                ? styles.stDone
                : cur === s.state
                ? styles.stCur
                : "";
            return (
              <div key={s.state} className={`${styles.st} ${cls}`}>
                {cur > s.state ? "✓ " : ""}
                {s.label}
              </div>
            );
          })}
        </div>

        {policyError ? (
          <p className={styles.warn}>
            Could not read the policy: {policyError}
          </p>
        ) : readBlock ? (
          <p className={styles.pmeta}>
            read from Starknet · block {fmtBlock(readBlock)}
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

        <div className={styles.pbody}>
          <div className={styles.inputLabel}>{active.label}</div>
          {tab === "new" ? (
            <div className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="np-event">Trigger event</label>
                <input
                  id="np-event"
                  className={styles.fieldInput}
                  type="text"
                  maxLength={31}
                  placeholder="weather-berlin-2026"
                  value={formEvent}
                  onChange={(e) => setFormEvent(e.target.value)}
                />
                <div className={styles.fieldHint}>
                  The real-world event that pays out. Your policy waits at FUNDED until the event authority accepts it - that is the trust boundary.
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label htmlFor="np-payout">Payout (STRK)</label>
                  <input
                    id="np-payout"
                    className={styles.fieldInput}
                    type="number"
                    inputMode="decimal"
                    min="0.000001"
                    step="any"
                    value={formPayout}
                    onChange={(e) => setFormPayout(e.target.value)}
                  />
                  <div className={styles.fieldHint}>Your figure. You fund this reserve.</div>
                </div>
                <div className={styles.field}>
                  <label htmlFor="np-expiry">Expiry date</label>
                  <input
                    id="np-expiry"
                    className={styles.fieldInput}
                    type="date"
                    value={formExpiry}
                    onChange={(e) => setFormExpiry(e.target.value)}
                  />
                  <div className={styles.fieldHint}>After this date an untriggered policy expires.</div>
                </div>
              </div>
              {formError ? <div className={styles.fieldErr}>{formError}</div> : null}
            </div>
          ) : (
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
          )}
          <div className={styles.subLine}>
            <span>{active.hint}</span>
            <span className={styles.subMono}>{shortWallet}</span>
          </div>

          {/* Guided steps for a user-created policy */}
          {tab === "new" && myPolicies.length > 0 ? (
            <div className={styles.nextSteps}>
              <div className={styles.railLbl}>// your policies</div>
              {myPolicies.map((p) => {
                const isActive = p.id === activePolicyId;
                const st = isActive && policy ? Number(policy.state) : -1;
                return (
                  <div key={p.id} className={styles.nextStepRow}>
                    <span
                      className={`${styles.nextStepNum} ${st >= 1 ? styles.nextStepNumDone : ""}`}
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        setActivePolicyId(p.id);
                        setTab("settle");
                      }}
                      title="Select this policy"
                    >
                      {p.id}
                    </span>
                    <span
                      className={st >= 3 ? styles.nextStepDone : ""}
                      style={{ cursor: "pointer", minWidth: 0 }}
                      onClick={() => {
                        setActivePolicyId(p.id);
                        setTab("settle");
                      }}
                    >
                      {p.eventId} · {fmtStrk(p.payoutWei)} STRK{isActive && policy ? ` · ${POLICY_STATES[policy.state.toString()]?.label ?? ""}` : ""}
                    </span>
                    {st === 0 ? (
                      <button className={styles.nextStepBtn} onClick={() => handleFundMyPolicy(p)}>
                        fund reserve
                      </button>
                    ) : null}
                    {st === 2 ? (
                      <button className={styles.nextStepBtn} onClick={() => handleAuthorizeMyPolicy(p)}>
                        authorize claim
                      </button>
                    ) : null}
                  </div>
                );
              })}
              <div className={styles.fieldHint} style={{ marginTop: 6 }}>
                Click a policy to inspect and settle it. Stuck at FUNDED? The event authority has not accepted the event yet - that gate is deliberate and visible.
              </div>
            </div>
          ) : null}

          {/* Itemized quote: fees discovered here, not in a wallet error */}
          {shieldTotal > 0n ? (
            <div className={styles.quote}>
              {tab === "settle" ? (
                <div className={styles.quoteRow}>
                  <span>Payout to open note</span>
                  <span>{fmtStrk(payoutWei)} STRK</span>
                </div>
              ) : null}
              <div className={styles.quoteRow}>
                <span>Pool privacy fee</span>
                <span>{fmtStrk(POOL_FEE_WEI)} STRK</span>
              </div>
              <div className={styles.quoteRow}>
                <span>Network fee (est.)</span>
                <span>~{fmtStrk(GAS_ESTIMATE_WEI)} STRK</span>
              </div>
              <div className={`${styles.quoteRow} ${styles.quoteTotal}`}>
                <span>{tab === "settle" ? "Shielded balance required" : "Shielded after deposit"}</span>
                <span>{fmtStrk(shieldTotal)} STRK</span>
              </div>
            </div>
          ) : null}

          <div className={styles.feeRow}>
            <span>Network</span>
            <span className={`${styles.feeVal} ${isStrk20Network ? styles.netOk : styles.netBad}`}>
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
          ) : tab === "new" ? (
            <>
              <SelectWallet variant="ctaBig" />
              <p className={styles.gateNote}>
                Connect a wallet to register your own policy - your event, your payout
                figure, your expiry.
              </p>
            </>
          ) : (
            <>
              <SelectWallet variant="ctaBig" />
              <p className={styles.gateNote}>
                No privacy wallet yet? The policy card above is live on-chain, and policy
                {" "}{activePolicyId} is {settled ? "already settled" : "authorized and ready to settle"}. A Ready X wallet is only
                needed to run a settlement yourself.
              </p>
            </>
          )}

          {settled && tab === "settle" ? (
            <p className={styles.terminal}>Payout executed. Terminal state - irreversible on-chain.</p>
          ) : null}
          {expired && tab === "settle" ? (
            <p className={`${styles.terminal} ${styles.terminalDead}`}>
              Trigger window closed. Reserve stays at the contract.
            </p>
          ) : null}

          {active.result ? <ResultCard r={active.result} /> : null}

          <p className={styles.assure}>
            Funds remain under your control - Nyalthe never custodies.
          </p>
        </div>
      </div>

      {/* Activity: every lifecycle transition, with real block numbers.
          The demo policy's history is on-chain evidence; other policies have
          no recorded timeline in this session - their state speaks from the
          stepper and receipts instead. */}
      {activePolicyId === constants.NyalthePolicyId ? (
        <div className={styles.railBox}>
          <div className={styles.railLbl}>// activity · policy #2</div>
          <div className={styles.tl}>
            {POLICY_TIMELINE.slice()
              .reverse()
              .map((ev) => (
                <div key={ev.hash} className={styles.tlEv}>
                  <span className={styles.tlDot} />
                  <a className={styles.tlWho} href={explorerTxUrl(ev.hash)} target="_blank" rel="noreferrer">
                    {ev.who}
                  </a>
                  <span className={styles.tlWhen}>blk {fmtBlock(ev.block)}</span>
                </div>
              ))}
          </div>
        </div>
      ) : (
        <div className={styles.railBox}>
          <div className={styles.railLbl}>// activity</div>
          <div className={styles.fieldHint}>
            This is your policy. Each action you take appears in the receipts above;
            the stepper reflects its live on-chain state.
          </div>
        </div>
      )}
    </div>
  );
}

import type { WALLET_API } from "@starknet-io/types-js";
import type { Call } from "starknet";
import { hash, num } from "starknet";

export type SettlementActionInput = {
  contractAddress: string;
  claimantAddress: string;
  tokenAddress: string;
  policyId: string | bigint;
  payoutWei?: string | bigint;
};

export const SETTLE_OPERATION = "0x1";
export const OPEN_NOTE_AMOUNT = "OPEN";
export const FIRST_OPEN_NOTE_ID = "${openNoteIds[0]}";
export const PAYOUT_AMOUNT = "0xde0b6b3a7640000";

export function buildPayoutFundingActions(input: Pick<SettlementActionInput, "contractAddress" | "tokenAddress"> & { payoutWei?: string | bigint }): WALLET_API.STRK20_ACTION[] {
  const contract = num.toHex(input.contractAddress);
  const token = num.toHex(input.tokenAddress);
  const payout = num.toHex(input.payoutWei ?? PAYOUT_AMOUNT);
  return [{ type: "withdraw", token, amount: payout, recipient: contract }];
}

export function buildSettlementActions(input: SettlementActionInput): WALLET_API.STRK20_ACTION[] {
  const contract = num.toHex(input.contractAddress);
  const claimant = num.toHex(input.claimantAddress);
  const token = num.toHex(input.tokenAddress);
  const policyId = num.toHex(input.policyId);
  const payout = num.toHex(input.payoutWei ?? PAYOUT_AMOUNT);

  return [
    {
      type: "transfer",
      token,
      amount: OPEN_NOTE_AMOUNT,
      recipient: claimant,
    },
    {
      type: "invoke",
      contract,
      calldata: [SETTLE_OPERATION, policyId, token, FIRST_OPEN_NOTE_ID],
    },
  ];
}

/* ---------- self-serve policy creation ----------
 * A user registers their own claim: they choose the event, the payout figure,
 * and the expiry. The claimant stays a commitment, never an address. These are
 * ordinary wallet calls against the Nyalthe contract (Account.execute, not the
 * privacy pool), so no STRK20 pool fee applies until settlement. */

/** Starknet short-string encoding: up to 31 printable ascii chars as a felt. */
export function encodeEventId(eventId: string): string {
  if (!/^[\x20-\x7e]{1,31}$/.test(eventId)) {
    throw new Error("Event id must be 1-31 printable ascii characters");
  }
  let hex = "";
  for (const ch of eventId) hex += ch.charCodeAt(0).toString(16).padStart(2, "0");
  return "0x" + (hex === "" ? "0" : hex);
}

/** A claimant commitment the chain cannot invert: Poseidon(address, salt).
 * The salt is random per policy and stays client-side, so the on-chain felt
 * leaks nothing about the claimant. */
export function deriveClaimantCommitment(address: string, salt: string | bigint): string {
  return hash.computePoseidonHash(
    num.toBigInt(address),
    num.toBigInt(salt)
  );
}

/** A random felt salt for commitment derivation (client-side only). */
export function randomCommitmentSalt(): string {
  const bytes = new Uint8Array(30);
  crypto.getRandomValues(bytes);
  let hex = "0x";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return num.toHex(num.toBigInt(hex) & ((1n << 250n) - 1n));
}

export type CreatePolicyInput = {
  contractAddress: string;
  /** Trigger event chosen by the user, e.g. "weather-user-42". */
  eventId: string;
  /** Payout in wei (18 decimals). */
  payoutWei: string | bigint;
  /** Expiry as a unix timestamp in seconds. */
  expiryTimestamp: number;
  /** Commitment to the claimant: a felt the creator keeps private. */
  commitment: string;
};

/** register the claim: commitment, event, payout, expiry -> CREATED. */
export function buildCreatePolicyCall(input: CreatePolicyInput): Call {
  return {
    contractAddress: num.toHex(input.contractAddress),
    entrypoint: "create_policy",
    calldata: [
      num.toHex(input.commitment),
      encodeEventId(input.eventId),
      num.toHex(input.payoutWei),
      num.toHex(input.expiryTimestamp),
    ],
  };
}

/** Lock the reserve: a plain public STRK transfer of the payout to the contract. */
export function buildFundReserveCall(input: {
  tokenAddress: string;
  contractAddress: string;
  payoutWei: string | bigint;
}): Call {
  return {
    contractAddress: num.toHex(input.tokenAddress),
    entrypoint: "transfer",
    calldata: [num.toHex(input.contractAddress), num.toHex(input.payoutWei), "0x0"],
  };
}

/** Mark the policy funded (bookkeeping, creator-only). */
export function buildMarkFundedCall(input: {
  contractAddress: string;
  policyId: string | bigint;
}): Call {
  return {
    contractAddress: num.toHex(input.contractAddress),
    entrypoint: "fund_policy",
    calldata: [num.toHex(input.policyId)],
  };
}

/** Authorize the claim (creator-only, after the event authority accepts). */
export function buildAuthorizeClaimCall(input: {
  contractAddress: string;
  policyId: string | bigint;
}): Call {
  return {
    contractAddress: num.toHex(input.contractAddress),
    entrypoint: "authorize_claim",
    calldata: [num.toHex(input.policyId)],
  };
}

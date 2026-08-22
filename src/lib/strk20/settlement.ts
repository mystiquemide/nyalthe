import type { WALLET_API } from "@starknet-io/types-js";
import { num } from "starknet";

export type SettlementActionInput = {
  contractAddress: string;
  claimantAddress: string;
  tokenAddress: string;
  policyId: string | bigint;
};

export const SETTLE_OPERATION = "0x1";
export const OPEN_NOTE_AMOUNT = "OPEN";
export const FIRST_OPEN_NOTE_ID = "${openNoteIds[0]}";
export const PAYOUT_AMOUNT = "0xde0b6b3a7640000";

export function buildPayoutFundingActions(input: Pick<SettlementActionInput, "contractAddress" | "tokenAddress">): WALLET_API.STRK20_ACTION[] {
  const contract = num.toHex(input.contractAddress);
  const token = num.toHex(input.tokenAddress);
  return [{ type: "withdraw", token, amount: PAYOUT_AMOUNT, recipient: contract }];
}

export function buildSettlementActions(input: SettlementActionInput): WALLET_API.STRK20_ACTION[] {
  const contract = num.toHex(input.contractAddress);
  const claimant = num.toHex(input.claimantAddress);
  const token = num.toHex(input.tokenAddress);
  const policyId = num.toHex(input.policyId);

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

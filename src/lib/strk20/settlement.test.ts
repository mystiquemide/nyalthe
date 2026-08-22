import { describe, expect, it } from "vitest";
import {
  FIRST_OPEN_NOTE_ID,
  OPEN_NOTE_AMOUNT,
  PAYOUT_AMOUNT,
  SETTLE_OPERATION,
  buildSettlementActions,
} from "./settlement";

describe("buildSettlementActions", () => {
  it("creates an open note before invoking Nyalthe", () => {
    const actions = buildSettlementActions({
      contractAddress: "0x123",
      claimantAddress: "0x456",
      tokenAddress: "0x789",
      policyId: 1n,
    });

    expect(actions).toEqual([
      {
        type: "withdraw",
        token: "0x789",
        amount: PAYOUT_AMOUNT,
        recipient: "0x123",
      },
      {
        type: "transfer",
        token: "0x789",
        amount: OPEN_NOTE_AMOUNT,
        recipient: "0x456",
      },
      {
        type: "invoke",
        contract: "0x123",
        calldata: [SETTLE_OPERATION, "0x1", "0x789", FIRST_OPEN_NOTE_ID],
      },
    ]);
  });

  it("keeps wallet placeholders literal", () => {
    const [, , invoke] = buildSettlementActions({
      contractAddress: "0x123",
      claimantAddress: "0x456",
      tokenAddress: "0x789",
      policyId: "0x2",
    });

    expect(invoke.type).toBe("invoke");
    if (invoke.type !== "invoke") throw new Error("expected invoke action");
    expect(invoke.calldata[3]).toBe("${openNoteIds[0]}");
  });
});

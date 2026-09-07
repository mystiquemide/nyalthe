import { describe, expect, it } from "vitest";
import {
  FIRST_OPEN_NOTE_ID,
  OPEN_NOTE_AMOUNT,
  PAYOUT_AMOUNT,
  SETTLE_OPERATION,
  buildAuthorizeClaimCall,
  buildCreatePolicyCall,
  buildFundReserveCall,
  buildMarkFundedCall,
  buildPayoutFundingActions,
  buildSettlementActions,
  encodeEventId,
} from "./settlement";

describe("buildSettlementActions", () => {
  it("builds the separate payout funding withdrawal", () => {
    expect(buildPayoutFundingActions({ contractAddress: "0x123", tokenAddress: "0x789" })).toEqual([
      { type: "withdraw", token: "0x789", amount: PAYOUT_AMOUNT, recipient: "0x123" },
    ]);
  });

  it("creates an open note before invoking Nyalthe", () => {
    const actions = buildSettlementActions({
      contractAddress: "0x123",
      claimantAddress: "0x456",
      tokenAddress: "0x789",
      policyId: 1n,
    });

    expect(actions).toEqual([
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
    const [, invoke] = buildSettlementActions({
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

describe("self-serve policy creation", () => {
  it("encodes event ids as short-string felts", () => {
    expect(encodeEventId("weather-user-1")).toBe("0x776561746865722d757365722d31");
    expect(() => encodeEventId("")).toThrow();
    expect(() => encodeEventId("too long ".repeat(5))).toThrow();
    expect(() => encodeEventId("bad\nchar")).toThrow();
  });

  it("builds the create_policy call with user-chosen fields", () => {
    const call = buildCreatePolicyCall({
      contractAddress: "0x123",
      eventId: "weather-user-1",
      payoutWei: 2_000_000_000_000_000_000n,
      expiryTimestamp: 1800000000,
      commitment: "0xabc",
    });

    expect(call.contractAddress).toBe("0x123");
    expect(call.entrypoint).toBe("create_policy");
    expect(call.calldata).toEqual([
      "0xabc",
      "0x776561746865722d757365722d31",
      "0x1bc16d674ec80000",
      "0x6b49d200",
    ]);
  });

  it("builds the reserve transfer as a plain u256 STRK transfer", () => {
    const call = buildFundReserveCall({
      tokenAddress: "0x789",
      contractAddress: "0x123",
      payoutWei: 1n,
    });

    expect(call.contractAddress).toBe("0x789");
    expect(call.entrypoint).toBe("transfer");
    expect(call.calldata).toEqual(["0x123", "0x1", "0x0"]);
  });

  it("builds mark-funded and authorize-claim calls on the policy contract", () => {
    expect(buildMarkFundedCall({ contractAddress: "0x123", policyId: 3n })).toEqual({
      contractAddress: "0x123",
      entrypoint: "fund_policy",
      calldata: ["0x3"],
    });
    expect(buildAuthorizeClaimCall({ contractAddress: "0x123", policyId: 3n })).toEqual({
      contractAddress: "0x123",
      entrypoint: "authorize_claim",
      calldata: ["0x3"],
    });
  });
});

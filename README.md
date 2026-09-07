# Nyalthe

Public proof for private claims on Starknet.

Nyalthe is a privacy-preserving parametric claims rail. A funded event policy settles a payout to a protected claimant through the STRK20 privacy pool, while the policy, the accepted event, the contract, and the settlement stay verifiable by anyone.

Built for the STRK20 Private Sprint. Live on **Starknet mainnet**.

## The problem

Parametric payouts (weather, flight, crop, disaster triggers) have a privacy problem. To pay a claimant, today's rails expose who got paid and how much, for everyone to see. Nyalthe inverts that: the **proof** is public, the **person** is protected.

## How it works

`Create policy -> Fund reserve -> Accept signed event -> Authorize claim -> Settle privately`

1. A policy creator registers a claim on the Nyalthe contract: a commitment to the claimant (never the address), the trigger event, the payout, and an expiry.
2. The reserve is funded. No claim can be authorized until the policy holds its reserve.
3. An authorized event authority submits the signed event record. Replay is blocked on-chain by the state machine.
4. The contract authorizes the claim.
5. Settlement runs **inside the STRK20 privacy pool**: the wallet withdraws the payout to the contract, then the pool calls `privacy_invoke` on Nyalthe, which checks the exact payout match and returns an open-note deposit. The claimant receives a shielded note. Only the claimant can prove they were paid.

## What is public and what is private

| Public on-chain | Protected |
|---|---|
| Policy terms, payout, expiry, state transitions | The claimant's identity (only a commitment is stored) |
| The accepted event record and replay protection | The receiving address (payout lands in an open note) |
| Contract logic and settlement finality | Movement of funds inside the pool |

Honest edge, stated plainly: deposits into and withdrawals from the pool are visible on-chain. Nyalthe protects the claimant and their receipt, not the fact that a privacy pool is being used.

## Live deployment

| | |
|---|---|
| Network | Starknet mainnet (`SN_MAIN`) |
| Nyalthe contract | [`0x01f929480b99cb165550086e495036381166d63041773a60a055dff2fc51f687`](https://starkscan.co/contract/0x01f929480b99cb165550086e495036381166d63041773a60a055dff2fc51f687) |
| Class hash | `0x073a3eb3964394234924c7b3ee0c13bd2b7fc4a5e195b3c83b61807ba2345a86` |
| STRK20 pool | `0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a` |
| Live policy | #2, event `weather-main-2`, payout 1 STRK |

### Policy #1 lifecycle (all verified on-chain)

| Step | Transaction |
|---|---|
| Deploy contract | [`0x0309d23b…20b9a3e`](https://starkscan.co/tx/0x0309d23b110ad8c0cd8d557a4a8c1f3ec9baf8cc8a832558b6e69526520b9a3e) |
| Create policy | [`0x009dde7b…0a042350`](https://starkscan.co/tx/0x009dde7bc3816ddaa4350679004578b3d57a99f97c29342ff63f4ccc0a042350) |
| Fund reserve | [`0x016c7bf4…a988dfee`](https://starkscan.co/tx/0x016c7bf4a6adb8639ee1c67ee91004b91e851b0762949b202c192ac7a988dfee) |
| Accept event | [`0x060bd0bc…136b26498`](https://starkscan.co/tx/0x060bd0bcfd5a927f36a41267bd99b393b51339df1167a631fdcf44c136b26498) |
| Authorize claim | [`0x019ecc2a…d637c038`](https://starkscan.co/tx/0x019ecc2a0074fe53e7ef659ae347d4b09888a558860d87ff20ec21edd637c038) |
| Fund through the pool | [`0x12c5bfe2…cc0c6e1`](https://starkscan.co/tx/0x12c5bfe20b8bd8c0c0a138ea227185a2e8eb1392c83c0af71bada2e1cc0c6e1) |
| **Settle privately** | [`0x6a3fd555…ebb07697`](https://starkscan.co/tx/0x6a3fd555fa1adaf7e42138958ca5b31dc39c1f78f45c98026e3ad6debb07697) |

The full transaction list for scoring is in [`strk20.json`](strk20.json).

## Try it

The demo is live at **https://nyalthe.vercel.app**.

1. Open the [claim workspace](https://nyalthe.vercel.app/app). The policy card reads live from the mainnet contract.
2. Connect a privacy-enabled wallet (Ready X, Wallet API >= 0.10.3) on Starknet mainnet. First-time users register a viewing key with the pool (one-time setup).
3. Shield STRK into the pool.
4. Settle the authorized policy: stage 1 withdraws the payout to the contract through the pool, stage 2 settles it into an open note for the claimant. The policy state flips to SETTLED on-chain.

Policy #1 was settled end-to-end on mainnet (its full transaction lifecycle is linked above). Policy #2 is the live policy the workspace settles now.

## Trust model

The event adapter is a trust boundary. The contract verifies that the event came from the authorized event authority and that the same event cannot be replayed. Whether the real-world event actually happened is asserted by the signed event source. That single handoff is deliberate and stated, not hidden.

## Contract guarantees

Each rule is an assertion in the Cairo contract, covered by the test suite (`snforge test`, 6 tests):

- Settlement only executes when called by the pinned STRK20 pool.
- One-way lifecycle: created, funded, event accepted, claim authorized, settled. Every step checks the exact prior state.
- Events accepted once; authority-gated triggers; funded before authorized.
- Exact payout match: settlement reverts unless the amount moved equals the on-chain policy payout.

## Run locally

```bash
npm install
npm run build       # Next.js app
npm test            # settlement action-builder tests

cd cairo
scarb build         # Cairo contract
snforge test        # contract test suite
```

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_PROVIDER_URL` (Alchemy key) for a dedicated RPC; without it the app falls back to a public RPC.

## Repository layout

```
cairo/                  Cairo policy contract + tests + deploy scripts
src/                    Next.js app (landing, sub-pages, claim workspace)
src/lib/strk20/         STRK20 settlement action builders (Wallet API)
strk20.json             Submission evidence: transactions, contracts, demo links
```

## License

MIT

#!/usr/bin/env bash
set -euo pipefail

: "${SNCAST_ACCOUNT:?Set SNCAST_ACCOUNT to a configured sncast account name or account file}"
: "${EVENT_AUTHORITY_ADDRESS:?Set EVENT_AUTHORITY_ADDRESS to the authorized event signer}"
: "${STRK20_POOL_ADDRESS:?Set STRK20_POOL_ADDRESS to the target STRK20 pool}"

NETWORK="${STARKNET_NETWORK:-sepolia}"
RPC_URL="${STARKNET_RPC_URL:-}"

cd "$(dirname "${BASH_SOURCE[0]}")/.."
scarb --release build

ARGS=(
  --contract-name Nyalthe
  --package strk20_invoke_helper
  --constructor-calldata "$EVENT_AUTHORITY_ADDRESS" "$STRK20_POOL_ADDRESS"
  --account "$SNCAST_ACCOUNT"
  --network "$NETWORK"
)

if [[ -n "$RPC_URL" ]]; then
  ARGS+=(--url "$RPC_URL")
fi

echo "Declaring and deploying Nyalthe on $NETWORK."
sncast deploy "${ARGS[@]}" --wait

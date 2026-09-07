import { ProviderInterface, RpcProvider } from "starknet";

// STRK token moved through the STRK20 privacy pool.
export const addrSTRK = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

// Nyalthe policy contract, deployed per network.
export const NyaltheSepoliaAddress = "0x07426e95949ac5bdc723237952e0a344c333ea4adb5968ea8a65b2b517a42a19";
export const NyaltheMainnetAddress = "0x01f929480b99cb165550086e495036381166d63041773a60a055dff2fc51f687";

// Resolve the Nyalthe policy contract for a frontend provider index (0 = Mainnet,
// 2 = Sepolia).
export function nyaltheAddressForIndex(index: number): string {
    if (index === 0) return NyaltheMainnetAddress;
    return NyaltheSepoliaAddress;
}

// The policy the claim workspace settles. Hardcoded: the production policy is
// deployed and verified on-chain; an env override would silently break the app
// if it pointed at a nonexistent policy.
export const NyalthePolicyId = "0x2";
export const NyalthePayoutWei = "1000000000000000000";
export const NyaltheClaimantAddress = "0x066c07d563dac5e1017a8a54cd0e63c7a51e2d205d48611a91ce9f52f2efceaa";

const alchemyKey = process.env.NEXT_PUBLIC_PROVIDER_URL;
// Keyless fallback uses Cartridge's public Starknet RPC. It supports the full
// method set (starknet_call, receipts) with permissive CORS. Set
// NEXT_PUBLIC_PROVIDER_URL to use Alchemy instead.
const mainnetRpc = alchemyKey
    ? `https://starknet-mainnet.g.alchemy.com/v2/${alchemyKey}`
    : "https://api.cartridge.gg/x/starknet/mainnet";
const sepoliaRpc = alchemyKey
    ? `https://starknet-sepolia.g.alchemy.com/v2/${alchemyKey}`
    : "https://api.cartridge.gg/x/starknet/sepolia";

// Frontend RPC providers, indexed. The STRK20 privacy pool lives on Mainnet (0)
// and Sepolia (2).
export const myFrontendProviders: ProviderInterface[] = [
    new RpcProvider({ nodeUrl: mainnetRpc }),
    new RpcProvider({ nodeUrl: sepoliaRpc }),
    new RpcProvider({ nodeUrl: sepoliaRpc })];

// Frontend provider indices where the STRK20 privacy pool is available, mapped to a
// display name. Used to gate the STRK20 wallet actions.
export const Strk20Networks: Record<number, string> = { 0: "MAINNET", 2: "SEPOLIA" };

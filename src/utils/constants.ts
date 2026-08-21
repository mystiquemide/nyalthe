import { ProviderInterface, RpcProvider } from "starknet";

export const addrSTRK = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
export const strk20PoolAddress = "0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a";
export const claimantAddress = process.env.NEXT_PUBLIC_CLAIMANT_ADDRESS ?? "";

// Provider index 0 is Starknet mainnet and index 2 is Starknet Sepolia.
export const myFrontendProviders: ProviderInterface[] = [
    new RpcProvider({ nodeUrl: "https://starknet-mainnet.g.alchemy.com/v2/" + process.env.NEXT_PUBLIC_PROVIDER_URL }),
    new RpcProvider({ nodeUrl: "https://starknet-testnet.public.blastapi.io/rpc/v0_7" }),
    new RpcProvider({ nodeUrl: "https://starknet-sepolia.g.alchemy.com/v2/" + process.env.NEXT_PUBLIC_PROVIDER_URL })];

export const Strk20Networks: Record<number, string> = { 0: "MAINNET", 2: "SEPOLIA" };

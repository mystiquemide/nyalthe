use starknet::ContractAddress;

#[cfg(test)]
mod tests;
#[cfg(test)]
mod test_token;

#[derive(Copy, Drop, Serde, starknet::Store, PartialEq, Debug)]
pub struct Policy {
    pub creator: ContractAddress,
    pub claimant_commitment: felt252,
    pub event_id: felt252,
    pub payout: u128,
    pub expiry: u64,
    pub state: u8,
}

#[derive(Copy, Drop, Serde, PartialEq, Debug)]
pub struct OpenNoteDeposit {
    pub note_id: felt252,
    pub token: ContractAddress,
    pub amount: u128,
}

#[derive(Copy, Drop, Serde, PartialEq, Debug)]
pub enum SettlementOperation {
    Fund,
    Settle,
}

#[starknet::interface]
pub trait IERC20<TState> {
    fn balance_of(self: @TState, account: ContractAddress) -> u256;
    fn approve(ref self: TState, spender: ContractAddress, amount: u256) -> bool;
}

#[starknet::interface]
pub trait INyalthe<TState> {
    fn create_policy(ref self: TState, claimant_commitment: felt252, event_id: felt252, payout: u128, expiry: u64) -> felt252;
    fn fund_policy(ref self: TState, policy_id: felt252);
    fn accept_event(ref self: TState, policy_id: felt252, event_id: felt252) -> bool;
    fn authorize_claim(ref self: TState, policy_id: felt252);
    fn privacy_invoke(ref self: TState, operation: SettlementOperation, policy_id: felt252, token: ContractAddress, note_id: felt252) -> Span<OpenNoteDeposit>;
    fn expire_policy(ref self: TState, policy_id: felt252);
    fn get_policy(self: @TState, policy_id: felt252) -> Policy;
    fn get_event_authority(self: @TState) -> ContractAddress;
}

#[starknet::contract]
pub mod Nyalthe {
    use core::num::traits::Zero;
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess};
    use starknet::{ContractAddress, get_block_timestamp, get_caller_address, get_contract_address};
    use super::{IERC20Dispatcher, IERC20DispatcherTrait, INyalthe, OpenNoteDeposit, Policy, SettlementOperation};

    const CREATED: u8 = 0;
    const FUNDED: u8 = 1;
    const EVENT_ACCEPTED: u8 = 2;
    const CLAIM_AUTHORIZED: u8 = 3;
    const SETTLED: u8 = 4;
    const EXPIRED: u8 = 5;

    mod errors {
        pub const ZERO_CLAIMANT: felt252 = 'ZERO_CLAIMANT';
        pub const ZERO_EVENT: felt252 = 'ZERO_EVENT';
        pub const ZERO_PAYOUT: felt252 = 'ZERO_PAYOUT';
        pub const EXPIRY_IN_PAST: felt252 = 'EXPIRY_IN_PAST';
        pub const NOT_FOUND: felt252 = 'NOT_FOUND';
        pub const NOT_CREATOR: felt252 = 'NOT_CREATOR';
        pub const NOT_EVENT_AUTHORITY: felt252 = 'NOT_EVENT_AUTHORITY';
        pub const INVALID_STATE: felt252 = 'INVALID_STATE';
        pub const EVENT_MISMATCH: felt252 = 'EVENT_MISMATCH';
        pub const NOT_PRIVACY_POOL: felt252 = 'NOT_PRIVACY_POOL';
    }

    #[storage]
    struct Storage {
        event_authority: ContractAddress,
        privacy_pool: ContractAddress,
        next_policy_id: u256,
        policies: Map<felt252, Policy>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        PolicyCreated: PolicyCreated,
        EventAccepted: EventAccepted,
        ClaimAuthorized: ClaimAuthorized,
        ClaimSettled: ClaimSettled,
        PolicyExpired: PolicyExpired,
    }

    #[derive(Drop, starknet::Event)]
    struct PolicyCreated { #[key] policy_id: felt252, creator: ContractAddress, payout: u128, expiry: u64 }
    #[derive(Drop, starknet::Event)]
    struct EventAccepted { #[key] policy_id: felt252, event_id: felt252 }
    #[derive(Drop, starknet::Event)]
    struct ClaimAuthorized { #[key] policy_id: felt252, claimant_commitment: felt252 }
    #[derive(Drop, starknet::Event)]
    struct ClaimSettled { #[key] policy_id: felt252 }
    #[derive(Drop, starknet::Event)]
    struct PolicyExpired { #[key] policy_id: felt252 }

    #[constructor]
    fn constructor(ref self: ContractState, event_authority: ContractAddress, privacy_pool: ContractAddress) {
        self.event_authority.write(event_authority);
        self.privacy_pool.write(privacy_pool);
        self.next_policy_id.write(1);
    }

    #[abi(embed_v0)]
    impl NyaltheImpl of INyalthe<ContractState> {
        fn create_policy(ref self: ContractState, claimant_commitment: felt252, event_id: felt252, payout: u128, expiry: u64) -> felt252 {
            assert(claimant_commitment != 0, errors::ZERO_CLAIMANT);
            assert(event_id != 0, errors::ZERO_EVENT);
            assert(payout != 0, errors::ZERO_PAYOUT);
            assert(expiry > get_block_timestamp(), errors::EXPIRY_IN_PAST);
            let id_u256 = self.next_policy_id.read();
            let policy_id: felt252 = id_u256.try_into().unwrap();
            let creator = get_caller_address();
            self.policies.write(policy_id, Policy { creator, claimant_commitment, event_id, payout, expiry, state: CREATED });
            self.next_policy_id.write(id_u256 + 1);
            self.emit(PolicyCreated { policy_id, creator, payout, expiry });
            policy_id
        }

        fn fund_policy(ref self: ContractState, policy_id: felt252) {
            let policy = self.policies.read(policy_id);
            assert(policy.creator.is_non_zero(), errors::NOT_FOUND);
            assert(get_caller_address() == policy.creator, errors::NOT_CREATOR);
            assert(policy.state == CREATED, errors::INVALID_STATE);
            self.policies.write(policy_id, Policy { state: FUNDED, ..policy });
        }

        fn accept_event(ref self: ContractState, policy_id: felt252, event_id: felt252) -> bool {
            assert(get_caller_address() == self.event_authority.read(), errors::NOT_EVENT_AUTHORITY);
            let policy = self.policies.read(policy_id);
            assert(policy.creator.is_non_zero(), errors::NOT_FOUND);
            assert(policy.state == FUNDED, errors::INVALID_STATE);
            assert(policy.event_id == event_id, errors::EVENT_MISMATCH);
            assert(get_block_timestamp() <= policy.expiry, errors::EXPIRY_IN_PAST);
            self.policies.write(policy_id, Policy { state: EVENT_ACCEPTED, ..policy });
            self.emit(EventAccepted { policy_id, event_id });
            true
        }

        fn authorize_claim(ref self: ContractState, policy_id: felt252) {
            let policy = self.policies.read(policy_id);
            assert(policy.creator.is_non_zero(), errors::NOT_FOUND);
            assert(get_caller_address() == policy.creator, errors::NOT_CREATOR);
            assert(policy.state == EVENT_ACCEPTED, errors::INVALID_STATE);
            self.policies.write(policy_id, Policy { state: CLAIM_AUTHORIZED, ..policy });
            self.emit(ClaimAuthorized { policy_id, claimant_commitment: policy.claimant_commitment });
        }

        fn privacy_invoke(ref self: ContractState, operation: SettlementOperation, policy_id: felt252, token: ContractAddress, note_id: felt252) -> Span<OpenNoteDeposit> {
            let pool = self.privacy_pool.read();
            assert(get_caller_address() == pool, errors::NOT_PRIVACY_POOL);
            let policy = self.policies.read(policy_id);
            assert(policy.creator.is_non_zero(), errors::NOT_FOUND);
            match operation {
                SettlementOperation::Fund => {
                    assert(policy.state == CREATED, errors::INVALID_STATE);
                    self.policies.write(policy_id, Policy { state: FUNDED, ..policy });
                    [].span()
                },
                SettlementOperation::Settle => {
                    assert(policy.state == CLAIM_AUTHORIZED, errors::INVALID_STATE);
                    let erc20 = IERC20Dispatcher { contract_address: token };
                    let balance: u256 = erc20.balance_of(get_contract_address());
                    let amount: u128 = balance.try_into().expect('PAYOUT_OVERFLOW');
                    assert(amount == policy.payout, 'PAYOUT_MISMATCH');
                    erc20.approve(pool, balance);
                    self.policies.write(policy_id, Policy { state: SETTLED, ..policy });
                    self.emit(ClaimSettled { policy_id });
                    [OpenNoteDeposit { note_id, token, amount }].span()
                },
            }
        }

        fn expire_policy(ref self: ContractState, policy_id: felt252) {
            let policy = self.policies.read(policy_id);
            assert(policy.creator.is_non_zero(), errors::NOT_FOUND);
            assert(policy.state == FUNDED, errors::INVALID_STATE);
            assert(get_block_timestamp() > policy.expiry, errors::INVALID_STATE);
            self.policies.write(policy_id, Policy { state: EXPIRED, ..policy });
            self.emit(PolicyExpired { policy_id });
        }

        fn get_policy(self: @ContractState, policy_id: felt252) -> Policy { self.policies.read(policy_id) }
        fn get_event_authority(self: @ContractState) -> ContractAddress { self.event_authority.read() }
    }
}

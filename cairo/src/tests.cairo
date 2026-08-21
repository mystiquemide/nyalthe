use crate::{INyaltheDispatcher, INyaltheDispatcherTrait, Nyalthe, SettlementOperation};
use crate::test_token::{IMockTokenDispatcher, IMockTokenDispatcherTrait, MockToken};
use snforge_std::{declare, DeclareResultTrait, cheat_caller_address, start_cheat_block_timestamp, stop_cheat_block_timestamp, CheatSpan};
use starknet::ContractAddress;
use starknet::deployment::DeploymentParams;
use starknet::SyscallResultTrait;

const CLAIMANT_COMMITMENT: felt252 = 'claimant';
const EVENT_ID: felt252 = 'weather-1';
const PAYOUT: u128 = 1_000_000_000_000_000_000;
const EXPIRY: u64 = 2_000_000_000;

fn deploy(authority: ContractAddress) -> INyaltheDispatcher {
    let class_hash = declare(contract: "Nyalthe").unwrap_syscall().contract_class().class_hash;
    let (address, _) = Nyalthe::deploy_for_test(*class_hash, DeploymentParams { salt: 0, deploy_from_zero: true }, authority, authority)
        .expect('Nyalthe deployment failed');
    INyaltheDispatcher { contract_address: address }
}

fn deploy_token() -> IMockTokenDispatcher {
    let class_hash = declare(contract: "MockToken").unwrap_syscall().contract_class().class_hash;
    let (address, _) = MockToken::deploy_for_test(*class_hash, DeploymentParams { salt: 1, deploy_from_zero: true }).unwrap_syscall();
    IMockTokenDispatcher { contract_address: address }
}

fn creator() -> ContractAddress { 'CREATOR'.try_into().unwrap() }
fn authority() -> ContractAddress { 'AUTHORITY'.try_into().unwrap() }

#[test]
fn test_policy_lifecycle() {
    let policy = deploy(authority());
    cheat_caller_address(policy.contract_address, creator(), CheatSpan::TargetCalls(1));
    let id = policy.create_policy(CLAIMANT_COMMITMENT, EVENT_ID, PAYOUT, EXPIRY);
    assert_eq!(policy.get_policy(id).state, 0);
    cheat_caller_address(policy.contract_address, creator(), CheatSpan::TargetCalls(1));
    policy.fund_policy(id);
    assert_eq!(policy.get_policy(id).state, 1);
    cheat_caller_address(policy.contract_address, authority(), CheatSpan::TargetCalls(1));
    assert!(policy.accept_event(id, EVENT_ID));
    assert_eq!(policy.get_policy(id).state, 2);
    cheat_caller_address(policy.contract_address, creator(), CheatSpan::TargetCalls(1));
    policy.authorize_claim(id);
    assert_eq!(policy.get_policy(id).state, 3);
    assert_eq!(policy.get_policy(id).state, 3);
}

#[test]
#[should_panic]
fn test_wrong_event_authority_rejected() {
    let policy = deploy(authority());
    cheat_caller_address(policy.contract_address, creator(), CheatSpan::TargetCalls(1));
    let id = policy.create_policy(CLAIMANT_COMMITMENT, EVENT_ID, PAYOUT, EXPIRY);
    cheat_caller_address(policy.contract_address, creator(), CheatSpan::TargetCalls(1));
    policy.fund_policy(id);
    cheat_caller_address(policy.contract_address, creator(), CheatSpan::TargetCalls(1));
    policy.accept_event(id, EVENT_ID);
}

#[test]
#[should_panic]
fn test_duplicate_authorization_rejected() {
    let policy = deploy(authority());
    cheat_caller_address(policy.contract_address, creator(), CheatSpan::TargetCalls(1));
    let id = policy.create_policy(CLAIMANT_COMMITMENT, EVENT_ID, PAYOUT, EXPIRY);
    cheat_caller_address(policy.contract_address, creator(), CheatSpan::TargetCalls(1));
    policy.fund_policy(id);
    cheat_caller_address(policy.contract_address, authority(), CheatSpan::TargetCalls(1));
    policy.accept_event(id, EVENT_ID);
    cheat_caller_address(policy.contract_address, creator(), CheatSpan::TargetCalls(1));
    policy.authorize_claim(id);
    policy.authorize_claim(id);
}

#[test]
fn test_expiry_transition() {
    let policy = deploy(authority());
    cheat_caller_address(policy.contract_address, creator(), CheatSpan::TargetCalls(1));
    let id = policy.create_policy(CLAIMANT_COMMITMENT, EVENT_ID, PAYOUT, EXPIRY);
    cheat_caller_address(policy.contract_address, creator(), CheatSpan::TargetCalls(1));
    policy.fund_policy(id);
    start_cheat_block_timestamp(policy.contract_address, EXPIRY + 1);
    policy.expire_policy(id);
    stop_cheat_block_timestamp(policy.contract_address);
    assert_eq!(policy.get_policy(id).state, 5);
}

#[test]
fn test_pool_settlement_returns_open_note() {
    let policy = deploy(authority());
    let token = deploy_token();
    cheat_caller_address(policy.contract_address, creator(), CheatSpan::TargetCalls(1));
    let id = policy.create_policy(CLAIMANT_COMMITMENT, EVENT_ID, PAYOUT, EXPIRY);
    cheat_caller_address(policy.contract_address, creator(), CheatSpan::TargetCalls(1));
    policy.fund_policy(id);
    cheat_caller_address(policy.contract_address, authority(), CheatSpan::TargetCalls(1));
    policy.accept_event(id, EVENT_ID);
    cheat_caller_address(policy.contract_address, creator(), CheatSpan::TargetCalls(1));
    policy.authorize_claim(id);
    token.set_balance(policy.contract_address, PAYOUT.into());
    cheat_caller_address(policy.contract_address, authority(), CheatSpan::TargetCalls(1));
    let deposits = policy.privacy_invoke(SettlementOperation::Settle, id, token.contract_address, 'OPEN_NOTE');
    assert_eq!(deposits.len(), 1);
    assert_eq!((*deposits[0]).note_id, 'OPEN_NOTE');
    assert_eq!((*deposits[0]).token, token.contract_address);
    assert_eq!((*deposits[0]).amount, PAYOUT);
    assert_eq!(policy.get_policy(id).state, 4);
}

#[test]
#[should_panic]
fn test_non_pool_cannot_invoke_settlement() {
    let policy = deploy(authority());
    cheat_caller_address(policy.contract_address, creator(), CheatSpan::TargetCalls(1));
    let id = policy.create_policy(CLAIMANT_COMMITMENT, EVENT_ID, PAYOUT, EXPIRY);
    cheat_caller_address(policy.contract_address, creator(), CheatSpan::TargetCalls(1));
    policy.privacy_invoke(SettlementOperation::Settle, id, 'TOKEN'.try_into().unwrap(), 'OPEN_NOTE');
}

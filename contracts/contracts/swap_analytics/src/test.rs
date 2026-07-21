#![cfg(test)]

use super::*;
use pair_registry::{AssetInfo, Pair, PairRegistry, PairRegistryClient};
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env, String, Symbol};

struct Fixture {
    env: Env,
    client: SwapAnalyticsClient<'static>,
    user: Address,
    pair_id: Symbol,
    registry: Address,
}
extern crate alloc;
fn setup() -> Fixture {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let issuer = Address::generate(&env);
    let user = Address::generate(&env);
    let registry = env.register(PairRegistry, (&admin,));
    let reg = PairRegistryClient::new(&env, &registry);
    let pair_id = Symbol::new(&env, "XLMUSDC");
    reg.register_pair(&Pair {
        pair_id: pair_id.clone(),
        base: AssetInfo {
            code: String::from_str(&env, "XLM"),
            issuer: None,
            is_native: true,
        },
        quote: AssetInfo {
            code: String::from_str(&env, "USDC"),
            issuer: Some(issuer),
            is_native: false,
        },
        active: true,
        max_slippage_bps: 100,
        created_at: 0,
        updated_at: 0,
    });
    let id = env.register(SwapAnalytics, (&admin, &registry));
    let env_ref = alloc::boxed::Box::leak(alloc::boxed::Box::new(env.clone()));
    let id_ref = alloc::boxed::Box::leak(alloc::boxed::Box::new(id));
    Fixture {
        env,
        client: SwapAnalyticsClient::new(env_ref, id_ref),
        user,
        pair_id,
        registry,
    }
}
fn hash(env: &Env, byte: u8) -> BytesN<32> {
    BytesN::from_array(env, &[byte; 32])
}

#[test]
fn records_swap_and_accumulates_stats() {
    let f = setup();
    f.client
        .record_swap(&f.user, &hash(&f.env, 1), &f.pair_id, &100, &95, &123);
    f.client
        .record_swap(&f.user, &hash(&f.env, 2), &f.pair_id, &50, &48, &124);
    let record = f.client.get_swap(&f.user, &hash(&f.env, 1));
    assert_eq!(record.sent_amount, 100);
    assert_eq!(record.timestamp, 123);
    let stats = f.client.get_user_stats(&f.user);
    assert_eq!(stats.swap_count, 2);
    assert_eq!(stats.total_sent, 150);
    assert_eq!(stats.total_received, 143);
}
#[test]
fn duplicate_and_invalid_amount_rejected() {
    let f = setup();
    let h = hash(&f.env, 1);
    f.client.record_swap(&f.user, &h, &f.pair_id, &1, &1, &1);
    assert_eq!(
        f.client
            .try_record_swap(&f.user, &h, &f.pair_id, &1, &1, &1),
        Err(Ok(Error::DuplicateSwap))
    );
    assert_eq!(
        f.client
            .try_record_swap(&f.user, &hash(&f.env, 2), &f.pair_id, &0, &1, &1),
        Err(Ok(Error::InvalidAmount))
    );
}
#[test]
fn inactive_pair_is_rejected_via_real_registry() {
    let f = setup();
    PairRegistryClient::new(&f.env, &f.registry).set_pair_status(&f.pair_id, &false);
    assert!(f
        .client
        .try_record_swap(&f.user, &hash(&f.env, 1), &f.pair_id, &1, &1, &1)
        .is_err());
}
#[test]
fn favorite_pair_requires_active_registry_pair() {
    let f = setup();
    f.client.set_favorite_pair(&f.user, &f.pair_id);
    assert_eq!(
        f.client.get_user_stats(&f.user).favorite_pair,
        Some(f.pair_id.clone())
    );
    PairRegistryClient::new(&f.env, &f.registry).set_pair_status(&f.pair_id, &false);
    assert!(f.client.try_set_favorite_pair(&f.user, &f.pair_id).is_err());
}
#[test]
fn missing_swap_and_empty_stats() {
    let f = setup();
    assert_eq!(
        f.client.try_get_swap(&f.user, &hash(&f.env, 9)),
        Err(Ok(Error::SwapNotFound))
    );
    assert_eq!(
        f.client
            .get_user_stats(&Address::generate(&f.env))
            .swap_count,
        0
    );
}
#[test]
fn registry_and_admin_configuration() {
    let f = setup();
    assert_eq!(f.client.get_registry(), f.registry);
    let next_registry = Address::generate(&f.env);
    f.client.set_registry(&next_registry);
    assert_eq!(f.client.get_registry(), next_registry);
    let next_admin = Address::generate(&f.env);
    f.client.transfer_admin(&next_admin);
    assert_eq!(f.client.get_admin(), next_admin);
}
#[test]
fn user_authorization_is_required() {
    let f = setup();
    f.env.mock_auths(&[]);
    assert!(f
        .client
        .try_record_swap(&f.user, &hash(&f.env, 1), &f.pair_id, &1, &1, &1)
        .is_err());
    assert!(f
        .client
        .try_set_registry(&Address::generate(&f.env))
        .is_err());
    assert!(f
        .client
        .try_transfer_admin(&Address::generate(&f.env))
        .is_err());
}

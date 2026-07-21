#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Env, String, Symbol,
};

struct Fixture {
    env: Env,
    client: PairRegistryClient<'static>,
    admin: Address,
    issuer: Address,
}
fn setup() -> Fixture {
    let env = Env::default();
    env.ledger().set_timestamp(1_000);
    let admin = Address::generate(&env);
    let issuer = Address::generate(&env);
    let id = env.register(PairRegistry, (&admin,));
    // Contract clients borrow values; leaked test values keep this helper concise.
    let env_ref = alloc::boxed::Box::leak(alloc::boxed::Box::new(env.clone()));
    let id_ref = alloc::boxed::Box::leak(alloc::boxed::Box::new(id));
    Fixture {
        env,
        client: PairRegistryClient::new(env_ref, id_ref),
        admin,
        issuer,
    }
}
extern crate alloc;
fn pair(env: &Env, issuer: &Address, id: &str) -> Pair {
    Pair {
        pair_id: Symbol::new(env, id),
        base: AssetInfo {
            code: String::from_str(env, "XLM"),
            issuer: None,
            is_native: true,
        },
        quote: AssetInfo {
            code: String::from_str(env, "USDC"),
            issuer: Some(issuer.clone()),
            is_native: false,
        },
        active: true,
        max_slippage_bps: 100,
        created_at: 77,
        updated_at: 88,
    }
}

#[test]
fn constructor_and_admin_auth() {
    let f = setup();
    assert_eq!(f.client.get_admin(), f.admin);
    assert!(f
        .client
        .try_register_pair(&pair(&f.env, &f.issuer, "XLMUSDC"))
        .is_err());
}
#[test]
fn registration_listing_and_timestamps() {
    let f = setup();
    f.env.mock_all_auths();
    let p = pair(&f.env, &f.issuer, "XLMUSDC");
    f.client.register_pair(&p);
    let got = f.client.get_pair(&p.pair_id);
    assert_eq!(got.created_at, 1_000);
    assert_eq!(got.updated_at, 1_000);
    assert_eq!(
        f.client.list_pair_ids(),
        soroban_sdk::vec![&f.env, p.pair_id]
    );
}
#[test]
fn duplicate_is_rejected() {
    let f = setup();
    f.env.mock_all_auths();
    let p = pair(&f.env, &f.issuer, "XLMUSDC");
    f.client.register_pair(&p);
    assert_eq!(
        f.client.try_register_pair(&p),
        Err(Ok(Error::PairAlreadyExists))
    );
}
#[test]
fn validates_assets_ids_and_slippage() {
    let f = setup();
    f.env.mock_all_auths();
    let mut p = pair(&f.env, &f.issuer, "");
    assert_eq!(f.client.try_register_pair(&p), Err(Ok(Error::EmptyPairId)));
    p = pair(&f.env, &f.issuer, "A");
    p.quote = p.base.clone();
    assert_eq!(
        f.client.try_register_pair(&p),
        Err(Ok(Error::IdenticalAssets))
    );
    p = pair(&f.env, &f.issuer, "B");
    p.base.issuer = Some(f.issuer.clone());
    assert_eq!(
        f.client.try_register_pair(&p),
        Err(Ok(Error::InvalidNativeAsset))
    );
    p = pair(&f.env, &f.issuer, "C");
    p.quote.issuer = None;
    assert_eq!(
        f.client.try_register_pair(&p),
        Err(Ok(Error::InvalidCreditAsset))
    );
    p = pair(&f.env, &f.issuer, "D");
    p.quote.code = String::from_str(&f.env, "");
    assert_eq!(
        f.client.try_register_pair(&p),
        Err(Ok(Error::EmptyAssetCode))
    );
    p = pair(&f.env, &f.issuer, "E");
    p.max_slippage_bps = 0;
    assert_eq!(
        f.client.try_register_pair(&p),
        Err(Ok(Error::InvalidSlippage))
    );
    p.max_slippage_bps = 5001;
    assert_eq!(
        f.client.try_register_pair(&p),
        Err(Ok(Error::InvalidSlippage))
    );
}
#[test]
fn update_preserves_creation_and_changes_values() {
    let f = setup();
    f.env.mock_all_auths();
    let mut p = pair(&f.env, &f.issuer, "XLMUSDC");
    f.client.register_pair(&p);
    f.env.ledger().set_timestamp(2_000);
    p.max_slippage_bps = 250;
    f.client.update_pair(&p);
    let got = f.client.get_pair(&p.pair_id);
    assert_eq!(got.created_at, 1_000);
    assert_eq!(got.updated_at, 2_000);
    assert_eq!(got.max_slippage_bps, 250);
}
#[test]
fn status_controls_active_assertion() {
    let f = setup();
    f.env.mock_all_auths();
    let p = pair(&f.env, &f.issuer, "XLMUSDC");
    f.client.register_pair(&p);
    f.client.assert_pair_active(&p.pair_id);
    f.client.set_pair_status(&p.pair_id, &false);
    assert_eq!(
        f.client.try_assert_pair_active(&p.pair_id),
        Err(Ok(Error::PairInactive))
    );
}
#[test]
fn admin_transfer_moves_authority() {
    let f = setup();
    f.env.mock_all_auths();
    let next = Address::generate(&f.env);
    f.client.transfer_admin(&next);
    assert_eq!(f.client.get_admin(), next);
}
#[test]
fn admin_transfer_requires_current_admin_auth() {
    let f = setup();
    let next = Address::generate(&f.env);
    assert!(f.client.try_transfer_admin(&next).is_err());
    assert_eq!(f.client.get_admin(), f.admin);
}
#[test]
fn missing_pair_errors() {
    let f = setup();
    assert_eq!(
        f.client.try_get_pair(&Symbol::new(&f.env, "NONE")),
        Err(Ok(Error::PairNotFound))
    );
}
